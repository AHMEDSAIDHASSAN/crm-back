import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { UserSessionsService } from './user-sessions.service';
import { CreateUserSessionDto } from './dto/create-user-session.dto';
import { UpdateUserSessionDto } from './dto/update-user-session.dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('User Sessions')
@Controller('user-sessions')
export class UserSessionsController {
  constructor(private readonly userSessionsService: UserSessionsService) { }

  @Post()
  @ApiOperation({ summary: 'Create a user session' })
  create(@Body() createUserSessionDto: CreateUserSessionDto) {
    return this.userSessionsService.create(createUserSessionDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all user sessions' })
  findAll() {
    return this.userSessionsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a user session by ID' })
  findOne(@Param('id') id: string) {
    return this.userSessionsService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a user session' })
  update(@Param('id') id: string, @Body() updateUserSessionDto: UpdateUserSessionDto) {
    return this.userSessionsService.update(+id, updateUserSessionDto);
  }

  @Post('revoke/:token')
  @ApiOperation({ summary: 'Revoke a session by token' })
  revokeSession(@Param('token') token: string) {
    return this.userSessionsService.revokeSession(token);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a user session' })
  remove(@Param('id') id: string) {
    return this.userSessionsService.remove(+id);
  }
}
