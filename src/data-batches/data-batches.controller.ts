import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { DataBatchesService } from './data-batches.service';
import { CreateDataBatchDto } from './dto/create-data-batch.dto';
import { UpdateDataBatchDto } from './dto/update-data-batch.dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { CAMPAIGN_DATA_BATCH_ROLES_TUPLE } from '../constants/roles';

@ApiTags('Data Batches')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...CAMPAIGN_DATA_BATCH_ROLES_TUPLE)
@Controller('data-batches')
export class DataBatchesController {
  constructor(private readonly dataBatchesService: DataBatchesService) { }

  @Post()
  @ApiOperation({ summary: 'Create a new data batch' })
  create(@Body() createDataBatchDto: CreateDataBatchDto) {
    return this.dataBatchesService.create(createDataBatchDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all data batches' })
  findAll() {
    return this.dataBatchesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a data batch by ID' })
  findOne(@Param('id') id: string) {
    return this.dataBatchesService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a data batch' })
  update(@Param('id') id: string, @Body() updateDataBatchDto: UpdateDataBatchDto) {
    return this.dataBatchesService.update(+id, updateDataBatchDto);
  }

  @Delete(':id')
  @Roles('super_admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete a data batch and all linked cold-call/campaign leads',
    description:
      'Removes meetings, calls, WhatsApp, feedback, assignments, notifications, and uploads tied to those leads, then the batch.',
  })
  remove(@Param('id') id: string) {
    return this.dataBatchesService.remove(+id);
  }
}
