import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { LeadUploadsService } from './lead-uploads.service';
import { CreateLeadUploadDto } from './dto/create-lead-upload.dto';
import { UpdateLeadUploadDto } from './dto/update-lead-upload.dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { CAMPAIGN_DATA_BATCH_ROLES_TUPLE } from '../constants/roles';

@ApiTags('Lead Uploads')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...CAMPAIGN_DATA_BATCH_ROLES_TUPLE)
@Controller('lead-uploads')
export class LeadUploadsController {
  constructor(private readonly leadUploadsService: LeadUploadsService) { }

  @Post()
  @ApiOperation({ summary: 'Log a lead upload process' })
  create(@Body() createLeadUploadDto: CreateLeadUploadDto) {
    return this.leadUploadsService.create(createLeadUploadDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all lead upload logs' })
  findAll() {
    return this.leadUploadsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a lead upload log by ID' })
  findOne(@Param('id') id: string) {
    return this.leadUploadsService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a lead upload log' })
  update(@Param('id') id: string, @Body() updateLeadUploadDto: UpdateLeadUploadDto) {
    return this.leadUploadsService.update(+id, updateLeadUploadDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a lead upload record' })
  remove(@Param('id') id: string) {
    return this.leadUploadsService.remove(+id);
  }
}
