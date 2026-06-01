import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  Request,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { LeadsService } from './leads.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { GetLeadsDto } from './dto/get-leads.dto';
import { BulkAssignLeadsDto } from './dto/bulk-assign-leads.dto';
import { BulkSendToRotationDto } from './dto/bulk-send-to-rotation.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('leads')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) { }

  @Post()
  @ApiOperation({ summary: 'Create a new lead' })
  @ApiResponse({ status: 201, description: 'Lead created successfully' })
  create(@Body() createLeadDto: CreateLeadDto, @Request() req) {
    return this.leadsService.create(createLeadDto, req.user.userId, req.user.role);
  }

  @Post('batch-import/:batchId')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Import leads from Excel/CSV for a specific batch' })
  async importBatch(
    @Param('batchId', ParseIntPipe) batchId: number,
    @UploadedFile() file: Express.Multer.File,
    @Body('mapping') mapping?: string,
  ) {
    return this.leadsService.batchImport(batchId, file, mapping);
  }

  @Get()
  @ApiOperation({ summary: 'Get all leads with pagination' })
  @ApiResponse({ status: 200, description: 'Leads retrieved successfully' })
  findAll(@Query() query: GetLeadsDto, @Request() req) {
    return this.leadsService.findAll(query, req.user.userId, req.user.role);
  }

  @Get('phone-info')
  @ApiOperation({ summary: 'Look up phone number details (carrier, type, leads in system)' })
  async phoneInfo(@Query('phone') phone: string, @Request() req) {
    return this.leadsService.getPhoneInfo(phone, req.user.userId, req.user.role);
  }

  @Get('caller-id')
  @ApiOperation({ summary: 'Get caller ID names from GetContact public search' })
  async callerId(@Query('phone') phone: string) {
    return this.leadsService.getCallerIdInfo(phone);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get lead by ID' })
  @ApiResponse({ status: 200, description: 'Lead found' })
  @ApiResponse({ status: 404, description: 'Lead not found' })
  findOne(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.leadsService.findOne(id, req.user.userId, req.user.role);
  }

  /** Static paths before `@Patch(':id')` — otherwise `bulk-rotation` is parsed as an id and ParseIntPipe returns 400. */
  @Patch('bulk-assign')
  @ApiOperation({ summary: 'Bulk assign leads to a user' })
  @ApiResponse({ status: 200, description: 'Leads assigned successfully' })
  bulkAssign(@Body() bulkAssignLeadsDto: BulkAssignLeadsDto, @Request() req) {
    return this.leadsService.bulkUpdate(bulkAssignLeadsDto, req.user.userId, req.user.role);
  }

  @Patch('bulk-rotation')
  @ApiOperation({ summary: 'Bulk send leads to rotation pool (unassign)' })
  @ApiResponse({ status: 200, description: 'Leads moved to rotation pool' })
  bulkRotation(@Body() dto: BulkSendToRotationDto, @Request() req) {
    return this.leadsService.bulkSendToRotation(dto.leadIds, req.user.role, { force: dto.force === true });
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update lead' })
  @ApiResponse({ status: 200, description: 'Lead updated successfully' })
  @ApiResponse({ status: 404, description: 'Lead not found' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateLeadDto: UpdateLeadDto,
    @Request() req,
  ) {
    return this.leadsService.update(id, updateLeadDto, req.user.userId, req.user.role);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete lead' })
  @ApiResponse({ status: 200, description: 'Lead deleted successfully' })
  @ApiResponse({ status: 404, description: 'Lead not found' })
  remove(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.leadsService.remove(id, req.user.userId, req.user.role);
  }

}

