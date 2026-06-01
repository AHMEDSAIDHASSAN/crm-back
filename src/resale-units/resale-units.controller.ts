import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ResaleUnitsService } from './resale-units.service';
import { CreateResaleUnitDto } from './dto/create-resale-unit.dto';
import { UpdateResaleUnitDto } from './dto/update-resale-unit.dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Resale Units')
@Controller('resale-units')
export class ResaleUnitsController {
  constructor(private readonly resaleUnitsService: ResaleUnitsService) { }

  @Post()
  @ApiOperation({ summary: 'Create a new resale unit' })
  create(@Body() createResaleUnitDto: CreateResaleUnitDto) {
    return this.resaleUnitsService.create(createResaleUnitDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all resale units' })
  findAll() {
    return this.resaleUnitsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a resale unit by ID' })
  findOne(@Param('id') id: string) {
    return this.resaleUnitsService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a resale unit' })
  update(@Param('id') id: string, @Body() updateResaleUnitDto: UpdateResaleUnitDto) {
    return this.resaleUnitsService.update(+id, updateResaleUnitDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a resale unit' })
  remove(@Param('id') id: string) {
    return this.resaleUnitsService.remove(+id);
  }
}
