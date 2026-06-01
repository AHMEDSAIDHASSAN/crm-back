import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { LeadFeedbackService } from './lead-feedback.service';
import { CreateLeadFeedbackDto } from './dto/create-lead-feedback.dto';
import { UpdateLeadFeedbackDto } from './dto/update-lead-feedback.dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Lead Feedback')
@Controller('lead-feedback')
export class LeadFeedbackController {
  constructor(private readonly leadFeedbackService: LeadFeedbackService) { }

  @Post()
  @ApiOperation({ summary: 'Create lead feedback' })
  create(@Body() createLeadFeedbackDto: CreateLeadFeedbackDto) {
    return this.leadFeedbackService.create(createLeadFeedbackDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all lead feedback' })
  findAll() {
    return this.leadFeedbackService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get lead feedback by ID' })
  findOne(@Param('id') id: string) {
    return this.leadFeedbackService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update lead feedback' })
  update(@Param('id') id: string, @Body() updateLeadFeedbackDto: UpdateLeadFeedbackDto) {
    return this.leadFeedbackService.update(+id, updateLeadFeedbackDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete lead feedback' })
  remove(@Param('id') id: string) {
    return this.leadFeedbackService.remove(+id);
  }
}
