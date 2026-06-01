import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { TeamMembersService } from './team-members.service';
import { CreateTeamMemberDto } from './dto/create-team-member.dto';
import { UpdateTeamMemberDto } from './dto/update-team-member.dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Team Members')
@Controller('team-members')
export class TeamMembersController {
  constructor(private readonly teamMembersService: TeamMembersService) { }

  @Post()
  @ApiOperation({ summary: 'Add a member to a team' })
  create(@Body() createTeamMemberDto: CreateTeamMemberDto) {
    return this.teamMembersService.create(createTeamMemberDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all team memberships' })
  findAll() {
    return this.teamMembersService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a team membership by ID' })
  findOne(@Param('id') id: string) {
    return this.teamMembersService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a team membership' })
  update(@Param('id') id: string, @Body() updateTeamMemberDto: UpdateTeamMemberDto) {
    return this.teamMembersService.update(+id, updateTeamMemberDto);
  }

  @Patch(':id/leave')
  @ApiOperation({ summary: 'Mark a member as left from a team' })
  leaveTeam(@Param('id') id: string) {
    return this.teamMembersService.leaveTeam(+id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove a team membership record' })
  remove(@Param('id') id: string) {
    return this.teamMembersService.remove(+id);
  }
}
