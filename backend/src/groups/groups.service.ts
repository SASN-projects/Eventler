import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Group } from './entities/group.entity';
import { GroupMember } from './entities/group-member.entity';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { GroupRole } from './enums/group-role.enum';

@Injectable()
export class GroupsService {
  constructor(
    @InjectRepository(Group)
    private groupRepository: Repository<Group>,
    @InjectRepository(GroupMember)
    private groupMemberRepository: Repository<GroupMember>,
  ) {}

  private toGroupResponse(group: Group) {
    return {
      ...group,
      members:
        group.members
          ?.map((member) => member.user ?? (member.userId ? { id: member.userId } : null))
          .filter(Boolean) ?? [],
    };
  }

  async create(userId: string, createGroupDto: CreateGroupDto) {
    const inviteLink = uuidv4();

    const group = this.groupRepository.create({
      name: createGroupDto.name,
      description: createGroupDto.description ?? '',
      createdById: userId,
      inviteLinkToken: inviteLink,
    });

    await this.groupRepository.save(group);

    // Add creator as member
    const members = [
      {
        groupId: group.id,
        userId,
        role: GroupRole.ADMIN,
      },
    ];

    const rawMemberIds = Array.isArray(createGroupDto.memberIds) ? createGroupDto.memberIds : [];
    const fallbackMembers = Array.isArray((createGroupDto as any).members) ? (createGroupDto as any).members : [];

    const resolvedMemberIds = new Set<string>();
    for (const memberId of rawMemberIds) {
      if (memberId && typeof memberId === 'string') {
        resolvedMemberIds.add(memberId);
      }
    }
    for (const member of fallbackMembers) {
      if (!member) continue;
      if (typeof member === 'string') {
        resolvedMemberIds.add(member);
      } else if (typeof member === 'object') {
        const extractedId = member.id ?? member.value ?? member.userId ?? member.uuid ?? null;
        if (extractedId) {
          resolvedMemberIds.add(String(extractedId));
        }
      }
    }

    for (const memberId of resolvedMemberIds) {
      if (memberId !== userId) {
        members.push({
          groupId: group.id,
          userId: memberId,
          role: GroupRole.MEMBER,
        });
      }
    }

    if (members.length > 0) {
      await this.groupMemberRepository.insert(members as any);
    }

    const savedGroup = await this.groupRepository.findOne({
      where: { id: group.id },
      relations: ['members', 'members.user'],
    });

    if (!savedGroup) {
      return group;
    }

    return this.toGroupResponse(savedGroup);
  }

  async findAll(userId: string) {
    const groups = await this.groupRepository
      .createQueryBuilder('group')
      .innerJoin('group.members', 'currentMember', 'currentMember.userId = :userId', { userId })
      .orderBy('group.createdAt', 'DESC')
      .getMany();

    if (groups.length === 0) {
      return [];
    }

    const members = await this.groupMemberRepository.find({
      where: { groupId: In(groups.map((group) => group.id)) },
      relations: ['user'],
    });
    const membersByGroupId = new Map<string, GroupMember[]>();

    for (const member of members) {
      const groupMembers = membersByGroupId.get(member.groupId) ?? [];
      groupMembers.push(member);
      membersByGroupId.set(member.groupId, groupMembers);
    }

    for (const group of groups) {
      group.members = membersByGroupId.get(group.id) ?? [];
    }

    return groups.map((group) => this.toGroupResponse(group));
  }

  async findOne(id: string, userId: string) {
    const group = await this.groupRepository.findOne({
      where: { id },
      relations: ['members', 'members.user'],
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    const isMember = group.members.some((member) => member.userId === userId);

    if (!isMember) {
      throw new ForbiddenException('You are not a member of this group');
    }

    return this.toGroupResponse(group);
  }

  async update(id: string, userId: string, updateGroupDto: UpdateGroupDto) {
    const group = await this.groupRepository.findOne({
      where: { id },
      relations: ['members'],
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    const isCreator = group.createdById === userId;

    if (!isCreator) {
      throw new ForbiddenException('Only the group creator can update the group');
    }

    if (updateGroupDto.name !== undefined) {
      group.name = updateGroupDto.name;
    }

    if (updateGroupDto.description !== undefined) {
      group.description = updateGroupDto.description;
    }

    await this.groupRepository.save(group);

    const updatedGroup = await this.groupRepository.findOne({
      where: { id },
      relations: ['members', 'members.user'],
    });

    if (!updatedGroup) {
      throw new NotFoundException('Group not found');
    }

    return this.toGroupResponse(updatedGroup);
  }

  async addMembers(groupId: string, requesterId: string, memberIds: string[]) {
    const group = await this.groupRepository.findOne({
      where: { id: groupId },
      relations: ['members'],
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    const isCreator = group.createdById === requesterId;
    if (!isCreator) {
      throw new ForbiddenException('Only the group creator can add new members');
    }

    const existing = new Set(group.members.map((m) => m.userId));
    const toCreate = [] as Partial<GroupMember>[];

    for (const id of memberIds) {
      if (!existing.has(id)) {
        toCreate.push({ groupId: group.id, userId: id, role: GroupRole.MEMBER });
      }
    }

    if (toCreate.length > 0) {
      await this.groupMemberRepository.save(toCreate as any);
    }

    const updatedGroup = await this.groupRepository.findOne({
      where: { id: groupId },
      relations: ['members', 'members.user'],
    });

    if (!updatedGroup) {
      throw new NotFoundException('Group not found');
    }

    return this.toGroupResponse(updatedGroup);
  }

  async removeMember(groupId: string, requesterId: string, userId: string) {
    const group = await this.groupRepository.findOne({
      where: { id: groupId },
      relations: ['members'],
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    const isCreator = group.createdById === requesterId;
    if (!isCreator) {
      throw new ForbiddenException('Only the group creator can remove members');
    }

    if (group.createdById === userId) {
      throw new ForbiddenException('The group creator cannot be removed from the group');
    }

    const member = await this.groupMemberRepository.findOne({ where: { groupId, userId } });
    if (!member) {
      throw new NotFoundException('Group member not found');
    }

    await this.groupMemberRepository.delete({ groupId, userId });
    return { success: true };
  }

  async remove(id: string, userId: string) {
    const group = await this.groupRepository.findOne({
      where: { id },
      relations: ['members'],
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    const isCreator = group.createdById === userId;
    if (!isCreator) {
      throw new ForbiddenException('Only the group creator can delete the group');
    }

    await this.groupRepository.delete(id);
    return { success: true };
  }
}
