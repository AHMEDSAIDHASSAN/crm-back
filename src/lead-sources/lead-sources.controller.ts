import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { LeadSourcesService } from './lead-sources.service';
import { CreateLeadSourceDto } from './dto/create-lead-source.dto';
import { UpdateLeadSourceDto } from './dto/update-lead-source.dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Lead Sources')
@Controller('lead-sources')
export class LeadSourcesController {
  constructor(private readonly leadSourcesService: LeadSourcesService) { }

  @Post()
  @ApiOperation({ summary: 'Create a new lead source' })
  create(@Body() createLeadSourceDto: CreateLeadSourceDto) {
    return this.leadSourcesService.create(createLeadSourceDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all lead sources' })
  findAll() {
    return this.leadSourcesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a lead source by ID' })
  findOne(@Param('id') id: string) {
    return this.leadSourcesService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a lead source' })
  update(@Param('id') id: string, @Body() updateLeadSourceDto: UpdateLeadSourceDto) {
    return this.leadSourcesService.update(+id, updateLeadSourceDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a lead source' })
  remove(@Param('id') id: string) {
    return this.leadSourcesService.remove(+id);
  }
}
