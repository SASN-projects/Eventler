import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Group } from './entities/group.entity';
import { GroupMember } from './entities/group-member.entity';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';

@Injectable()
export class GroupsService {
  constructor(
    @InjectRepository(Group)
    private groupRepository: Repository<Group>,
    @InjectRepository(GroupMember)
    private groupMemberRepository: Repository<GroupMember>,
  ) {}

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
      },
    ];

    // Add additional members if provided
    if (createGroupDto.memberIds && createGroupDto.memberIds.length > 0) {
      for (const memberId of createGroupDto.memberIds) {
        if (memberId !== userId) {
          // Don't add creator twice
          members.push({
            groupId: group.id,
            userId: memberId,
          });
        }
      }
    }

    await this.groupMemberRepository.save(members);

    return group;
  }

  async findAll(userId: string) {
    const groups = await this.groupRepository
      .createQueryBuilder('group')
      .leftJoinAndSelect('group.members', 'member')
      .where('member.userId = :userId', { userId })
      .getMany();

    return groups;
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

    return group;
  }

  async update(id: string, userId: string, updateGroupDto: UpdateGroupDto) {
    const group = await this.groupRepository.findOne({
      where: { id },
      relations: ['members'],
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    const isMember = group.members.some((member) => member.userId === userId);

    if (!isMember) {
      throw new ForbiddenException('Only group members can update the group');
    }

    Object.assign(group, updateGroupDto);
    await this.groupRepository.save(group);

    return group;
  }

  async addMembers(groupId: string, requesterId: string, memberIds: string[]) {
    const group = await this.groupRepository.findOne({
      where: { id: groupId },
      relations: ['members'],
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    const isMember = group.members.some((m) => m.userId === requesterId);
    if (!isMember) {
      throw new ForbiddenException('Only group members can add new members');
    }

    const existing = new Set(group.members.map((m) => m.userId));
    const toCreate = [] as Partial<GroupMember>[];

    for (const id of memberIds) {
      if (!existing.has(id)) {
        toCreate.push({ groupId: group.id, userId: id });
      }
    }

    if (toCreate.length > 0) {
      await this.groupMemberRepository.save(toCreate as any);
    }

    return await this.groupRepository.findOne({ where: { id: groupId }, relations: ['members', 'members.user'] });
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
    if (!isCreator && requesterId !== userId) {
      throw new ForbiddenException('Only the group creator or the user themselves can remove a member');
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
