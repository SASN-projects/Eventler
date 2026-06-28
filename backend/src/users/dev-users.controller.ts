import { Controller, Get, Put, Body } from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';

// Development controller to operate on the fixed connected user without auth
@Controller('dev/users')
export class DevUsersController {
  private readonly FIXED_USER_ID = '11111111-1111-1111-1111-111111111111';

  constructor(private readonly usersService: UsersService) {}

  @Get()
  async findAll() {
    return this.usersService.findAll();
  }

  @Get('me')
  async getMe() {
    return this.usersService.getMe(this.FIXED_USER_ID);
  }

  @Get('events')
  async getEvents() {
    return this.usersService.getUserEvents(this.FIXED_USER_ID);
  }

  @Put('me')
  async updateMe(@Body() updateUserDto: UpdateUserDto) {
    return this.usersService.updateMe(this.FIXED_USER_ID, updateUserDto);
  }
}
