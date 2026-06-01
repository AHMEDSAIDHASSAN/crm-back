import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { TeamsService } from './teams.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/guards/roles.guard';

@Controller('teams')
@UseGuards(JwtAuthGuard)
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) { }

  @Get()
  @UseGuards(RolesGuard)
  @Roles('super_admin', 'operation_manager', 'sales_manager', 'tech_lead')
  findAll(@Request() req: { user: { userId: string; role: string } }) {
    return this.teamsService.findAll(Number(req.user.userId), req.user.role);
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles('super_admin', 'operation_manager', 'sales_manager', 'tech_lead')
  findOne(@Param('id') id: string, @Request() req: { user: { userId: string; role: string } }) {
    return this.teamsService.findOne(+id, Number(req.user.userId), req.user.role);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('super_admin')
  create(@Body() createTeamDto: CreateTeamDto) {
    return this.teamsService.create(createTeamDto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('super_admin')
  update(@Param('id') id: string, @Body() updateTeamDto: UpdateTeamDto) {
    return this.teamsService.update(+id, updateTeamDto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('super_admin')
  remove(@Param('id') id: string) {
    return this.teamsService.remove(+id);
  }
}
