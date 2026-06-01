import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { LeadAssignmentsService } from './lead-assignments.service';
import { CreateLeadAssignmentDto } from './dto/create-lead-assignment.dto';
import { UpdateLeadAssignmentDto } from './dto/update-lead-assignment.dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Lead Assignments')
@Controller('lead-assignments')
export class LeadAssignmentsController {
  constructor(private readonly leadAssignmentsService: LeadAssignmentsService) { }

  @Post()
  @ApiOperation({ summary: 'Create a lead assignment' })
  create(@Body() createLeadAssignmentDto: CreateLeadAssignmentDto) {
    return this.leadAssignmentsService.create(createLeadAssignmentDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all lead assignments' })
  findAll() {
    return this.leadAssignmentsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a lead assignment by ID' })
  findOne(@Param('id') id: string) {
    return this.leadAssignmentsService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a lead assignment' })
  update(@Param('id') id: string, @Body() updateLeadAssignmentDto: UpdateLeadAssignmentDto) {
    return this.leadAssignmentsService.update(+id, updateLeadAssignmentDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a lead assignment record' })
  remove(@Param('id') id: string) {
    return this.leadAssignmentsService.remove(+id);
  }
}
