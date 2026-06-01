import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { UnitsService } from './units.service';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';
import { PublishUnitDto } from './dto/publish-unit.dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { UNIT_FULL_ACCESS_ROLES, UNIT_PUBLISH_ROLES } from '../constants/roles';

@ApiTags('Units')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('units')
export class UnitsController {
  constructor(private readonly unitsService: UnitsService) {}

  @Post()
  @Roles(...(UNIT_FULL_ACCESS_ROLES as unknown as [string, ...string[]]))
  @ApiOperation({ summary: 'Create a new unit (not marketing)' })
  create(@Body() createUnitDto: CreateUnitDto, @Request() req: { user: { userId: string } }) {
    return this.unitsService.create(createUnitDto, Number(req.user.userId));
  }

  @Get()
  @ApiOperation({
    summary:
      'List units — sales: own uploads + published inventory only; other inventory roles: full list; marketing: full list',
  })
  findAll(
    @Request() req: { user: { userId: string; role: string } },
    @Query('q') q?: string,
    @Query('salesId') salesId?: string,
    @Query('teamId') teamId?: string,
  ) {
    return this.unitsService.findAll(Number(req.user.userId), req.user.role, { q, salesId, teamId });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a unit by ID (sales: own or published only)' })
  findOne(@Param('id') id: string, @Request() req: { user: { userId: string; role: string } }) {
    return this.unitsService.findOne(+id, Number(req.user.userId), req.user.role);
  }

  @Patch(':id/publish')
  @Roles(...(UNIT_PUBLISH_ROLES as unknown as [string, ...string[]]))
  @ApiOperation({ summary: 'Publish / unpublish unit and set public listing link' })
  publish(
    @Param('id') id: string,
    @Body() publishUnitDto: PublishUnitDto,
    @Request() req: { user: { userId: string } },
  ) {
    return this.unitsService.publish(+id, publishUnitDto, Number(req.user.userId));
  }

  @Patch(':id')
  @Roles(...(UNIT_FULL_ACCESS_ROLES as unknown as [string, ...string[]]))
  @ApiOperation({ summary: 'Update unit inventory (not marketing)' })
  update(
    @Param('id') id: string,
    @Body() updateUnitDto: UpdateUnitDto,
    @Request() req: { user: { userId: string; role: string } },
  ) {
    return this.unitsService.update(+id, updateUnitDto, req.user.role, Number(req.user.userId));
  }

  @Delete(':id')
  @Roles(...(UNIT_FULL_ACCESS_ROLES as unknown as [string, ...string[]]))
  @ApiOperation({ summary: 'Delete a unit (not marketing)' })
  remove(@Param('id') id: string, @Request() req: { user: { userId: string; role: string } }) {
    return this.unitsService.remove(+id, req.user.role, Number(req.user.userId));
  }
}
