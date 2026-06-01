import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { CallsService } from './calls.service';
import { CreateCallDto } from './dto/create-call.dto';
import { UpdateCallDto } from './dto/update-call.dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Calls')
@Controller('calls')
export class CallsController {
  constructor(private readonly callsService: CallsService) { }

  @Post()
  @ApiOperation({ summary: 'Log a new call' })
  create(@Body() createCallDto: CreateCallDto) {
    return this.callsService.create(createCallDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all call logs' })
  findAll() {
    return this.callsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a call log by ID' })
  findOne(@Param('id') id: string) {
    return this.callsService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a call log' })
  update(@Param('id') id: string, @Body() updateCallDto: UpdateCallDto) {
    return this.callsService.update(+id, updateCallDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a call log' })
  remove(@Param('id') id: string) {
    return this.callsService.remove(+id);
  }
}
