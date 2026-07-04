import { Controller, Delete, Get, Post, Put, Body, Param, UseGuards, Request } from '@nestjs/common';
import { GroupsService } from './groups.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { AddMembersDto } from './dto/add-members.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthRequest } from '../auth/interfaces/auth-request.interface';

@Controller('groups')
@UseGuards(JwtAuthGuard)
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Post()
  async create(@Request() req: AuthRequest, @Body() createGroupDto: CreateGroupDto) {
    return await this.groupsService.create(req.user.sub, createGroupDto);
  }

  @Get()
  async findAll(@Request() req: AuthRequest) {
    return await this.groupsService.findAll(req.user.sub);
  }

  @Get(':id/events')
  async findEvents(@Request() req: AuthRequest, @Param('id') id: string) {
    return await this.groupsService.findGroupEvents(id, req.user.sub);
  }

  @Get(':id')
  async findOne(@Request() req: AuthRequest, @Param('id') id: string) {
    return await this.groupsService.findOne(id, req.user.sub);
  }

  @Put(':id')
  async update(@Request() req: AuthRequest, @Param('id') id: string, @Body() updateGroupDto: UpdateGroupDto) {
    return await this.groupsService.update(id, req.user.sub, updateGroupDto);
  }

  @Post(':id/members')
  async addMembers(@Request() req: AuthRequest, @Param('id') id: string, @Body() addMembersDto: AddMembersDto) {
    return await this.groupsService.addMembers(id, req.user.sub, addMembersDto.memberIds ?? []);
  }

  @Delete(':id/members/:userId')
  async removeMember(@Request() req: AuthRequest, @Param('id') id: string, @Param('userId') userId: string) {
    return await this.groupsService.removeMember(id, req.user.sub, userId);
  }

  @Delete(':id')
  async remove(@Request() req: AuthRequest, @Param('id') id: string) {
    return await this.groupsService.remove(id, req.user.sub);
  }
}
