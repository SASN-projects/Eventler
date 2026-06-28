import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
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

  private toGroupResponse(group: Group) {
    return {
      ...group,
      members:
        group.members
          ?.map((member) => {
            const user = member.user;

            return {
              id: user?.id ?? member.userId,
              userId: member.userId,
              role: member.role,
              firstName: user?.firstName,
              lastName: user?.lastName,
              username: user?.username,
              email: user?.email,
              name:
                `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() ||
                user?.username ||
                member.userId,
            };
          })
          .filter(Boolean) ?? [],
    };
  }

  private async loadMembersForGroupIds(groupIds: string[]) {
    if (groupIds.length === 0) {
      return new Map<string, GroupMember[]>();
    }

    const membersByGroupId = new Map<string, GroupMember[]>();
    const rows = await this.groupMemberRepository
      .createQueryBuilder('member')
      .leftJoin('users', 'user', 'user.id = member.user_id')
      .select([
        'member.group_id AS group_id',
        'member.user_id AS user_id',
        'member.role AS role',
        'member.joined_at AS joined_at',
        'user.id AS id',
        'user.first_name AS first_name',
        'user.last_name AS last_name',
        'user.username AS username',
        'user.email AS email',
      ])
      .where('member.group_id IN (:...groupIds)', { groupIds })
      .orderBy('member.joined_at', 'ASC')
      .getRawMany();

    for (const row of rows) {
      const member = {
        groupId: row.group_id,
        userId: row.user_id,
        role: row.role,
        joinedAt: row.joined_at,
        user: row.id
          ? {
              id: row.id,
              firstName: row.first_name,
              lastName: row.last_name,
              username: row.username,
              email: row.email,
            }
          : undefined,
      } as GroupMember;
      const groupMembers = membersByGroupId.get(member.groupId) ?? [];
      groupMembers.push(member);
      membersByGroupId.set(member.groupId, groupMembers);
    }

    return membersByGroupId;
  }

  private async loadGroupWithMembers(groupId: string) {
    const group = await this.groupRepository.findOne({ where: { id: groupId } });

    if (!group) {
      return null;
    }

    const membersByGroupId = await this.loadMembersForGroupIds([group.id]);
    group.members = membersByGroupId.get(group.id) ?? [];

    return group;
  }

  private async ensureCreatorMembership(groups: Group[]) {
    const missingCreatorMembers = groups
      .filter(
        (group) =>
          group.createdById &&
          !(group.members ?? []).some((member) => member.userId === group.createdById),
      )
      .map((group) => ({
        groupId: group.id,
        userId: group.createdById,
      }));

    if (missingCreatorMembers.length === 0) {
      return false;
    }

    await this.groupMemberRepository.insert(missingCreatorMembers as any);
    return true;
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

    const members = [
      {
        groupId: group.id,
        userId,
      },
    ];

    const memberIds = new Set(createGroupDto.memberIds ?? []);
    for (const memberId of memberIds) {
      if (memberId !== userId) {
        members.push({
          groupId: group.id,
          userId: memberId,
        });
      }
    }

    await this.groupMemberRepository.insert(members as any);

    const savedGroup = await this.loadGroupWithMembers(group.id);

    return savedGroup ? this.toGroupResponse(savedGroup) : group;
  }

  async findAll(userId: string) {
    const currentUserMemberships = await this.groupMemberRepository.find({
      where: { userId },
      select: ['groupId'],
    });
    const groupIds = currentUserMemberships.map((member) => member.groupId);
    const groups = await this.groupRepository.find({
      where: groupIds.length > 0 ? [{ createdById: userId }, { id: In(groupIds) }] : [{ createdById: userId }],
      order: { createdAt: 'DESC' },
    });

    if (groups.length === 0) {
      return [];
    }

    let membersByGroupId = await this.loadMembersForGroupIds(groups.map((group) => group.id));

    for (const group of groups) {
      group.members = membersByGroupId.get(group.id) ?? [];
    }

    const restoredCreators = await this.ensureCreatorMembership(groups);
    if (restoredCreators) {
      membersByGroupId = await this.loadMembersForGroupIds(groups.map((group) => group.id));
      for (const group of groups) {
        group.members = membersByGroupId.get(group.id) ?? [];
      }
    }

    return groups.map((group) => this.toGroupResponse(group));
  }

  async findOne(id: string, userId: string) {
    const group = await this.loadGroupWithMembers(id);

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    const isMember = group.members.some((member) => member.userId === userId);
    const isCreator = group.createdById === userId;

    if (!isMember && !isCreator) {
      throw new ForbiddenException('You are not a member of this group');
    }

    if (isCreator && !isMember) {
      await this.ensureCreatorMembership([group]);
      const restoredGroup = await this.loadGroupWithMembers(id);
      return this.toGroupResponse(restoredGroup ?? group);
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

    const updatedGroup = await this.loadGroupWithMembers(id);

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

    if (group.createdById !== requesterId) {
      throw new ForbiddenException('Only the group creator can add new members');
    }

    const existing = new Set(group.members.map((member) => member.userId));
    const toCreate = memberIds
      .filter((memberId) => !existing.has(memberId))
      .map((memberId) => ({
        groupId: group.id,
        userId: memberId,
      }));

    if (toCreate.length > 0) {
      await this.groupMemberRepository.save(toCreate as any);
    }

    const updatedGroup = await this.loadGroupWithMembers(groupId);

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

    if (group.createdById !== requesterId) {
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

    if (group.createdById !== userId) {
      throw new ForbiddenException('Only the group creator can delete the group');
    }

    await this.groupMemberRepository.delete({ groupId: id });
    await this.groupRepository.delete(id);
    return { success: true };
  }
}
