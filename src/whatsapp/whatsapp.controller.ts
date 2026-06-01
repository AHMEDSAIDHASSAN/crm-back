import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import { CreateWhatsappDto } from './dto/create-whatsapp.dto';
import { UpdateWhatsappDto } from './dto/update-whatsapp.dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('WhatsApp')
@Controller('whatsapp')
export class WhatsappController {
  constructor(private readonly whatsappService: WhatsappService) { }

  @Post()
  @ApiOperation({ summary: 'Log a WhatsApp interaction' })
  create(@Body() createWhatsappDto: CreateWhatsappDto) {
    return this.whatsappService.create(createWhatsappDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all WhatsApp interactions' })
  findAll() {
    return this.whatsappService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a WhatsApp interaction by ID' })
  findOne(@Param('id') id: string) {
    return this.whatsappService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a WhatsApp interaction' })
  update(@Param('id') id: string, @Body() updateWhatsappDto: UpdateWhatsappDto) {
    return this.whatsappService.update(+id, updateWhatsappDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a WhatsApp interaction' })
  remove(@Param('id') id: string) {
    return this.whatsappService.remove(+id);
  }
}
