import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { LeadAutoRetractionsService } from './lead-auto-retractions.service';
import { CreateLeadAutoRetractionDto } from './dto/create-lead-auto-retraction.dto';
import { UpdateLeadAutoRetractionDto } from './dto/update-lead-auto-retraction.dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Lead Auto-Retractions')
@Controller('lead-auto-retractions')
export class LeadAutoRetractionsController {
  constructor(private readonly leadAutoRetractionsService: LeadAutoRetractionsService) { }

  @Post()
  @ApiOperation({ summary: 'Log a lead auto-retraction' })
  create(@Body() createLeadAutoRetractionDto: CreateLeadAutoRetractionDto) {
    return this.leadAutoRetractionsService.create(createLeadAutoRetractionDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all auto-retraction logs' })
  findAll() {
    return this.leadAutoRetractionsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an auto-retraction log by ID' })
  findOne(@Param('id') id: string) {
    return this.leadAutoRetractionsService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an auto-retraction log' })
  update(@Param('id') id: string, @Body() updateLeadAutoRetractionDto: UpdateLeadAutoRetractionDto) {
    return this.leadAutoRetractionsService.update(+id, updateLeadAutoRetractionDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an auto-retraction record' })
  remove(@Param('id') id: string) {
    return this.leadAutoRetractionsService.remove(+id);
  }
}
