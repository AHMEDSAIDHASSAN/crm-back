import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { AuditService } from './audit.service';
import { CreateAuditDto } from './dto/create-audit.dto';
import { UpdateAuditDto } from './dto/update-audit.dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Audit Logs')
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) { }

  @Post()
  @ApiOperation({ summary: 'Create an audit log entry' })
  create(@Body() createAuditDto: CreateAuditDto) {
    return this.auditService.create(createAuditDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all audit logs' })
  findAll() {
    return this.auditService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an audit log by ID' })
  findOne(@Param('id') id: string) {
    return this.auditService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an audit log (Admin only suggested)' })
  update(@Param('id') id: string, @Body() updateAuditDto: UpdateAuditDto) {
    return this.auditService.update(+id, updateAuditDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an audit log' })
  remove(@Param('id') id: string) {
    return this.auditService.remove(+id);
  }
}
