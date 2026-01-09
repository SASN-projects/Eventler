import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
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
  ) { }

  async create(userId: string, createGroupDto: CreateGroupDto) {
    const inviteLink = uuidv4();

    const group = this.groupRepository.create({
      ...createGroupDto,
      inviteLink,
    });

    await this.groupRepository.save(group);

    const member = this.groupMemberRepository.create({
      groupId: group.id,
      userId,
    });

    await this.groupMemberRepository.save(member);

    return group;
  }

  async findAll(userId: string) {
    const groups = await this.groupRepository
      .createQueryBuilder('group')
      .leftJoin('group.members', 'member')
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
}
