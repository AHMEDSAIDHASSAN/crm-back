import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { LeadRotationRulesService } from './lead-rotation-rules.service';
import { CreateLeadRotationRuleDto } from './dto/create-lead-rotation-rule.dto';
import { UpdateLeadRotationRuleDto } from './dto/update-lead-rotation-rule.dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Lead Rotation Rules')
@Controller('lead-rotation-rules')
export class LeadRotationRulesController {
  constructor(private readonly leadRotationRulesService: LeadRotationRulesService) { }

  @Post()
  @ApiOperation({ summary: 'Create a new rotation rule' })
  create(@Body() createLeadRotationRuleDto: CreateLeadRotationRuleDto) {
    return this.leadRotationRulesService.create(createLeadRotationRuleDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all rotation rules' })
  findAll() {
    return this.leadRotationRulesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a rotation rule by ID' })
  findOne(@Param('id') id: string) {
    return this.leadRotationRulesService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a rotation rule' })
  update(@Param('id') id: string, @Body() updateLeadRotationRuleDto: UpdateLeadRotationRuleDto) {
    return this.leadRotationRulesService.update(+id, updateLeadRotationRuleDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a rotation rule' })
  remove(@Param('id') id: string) {
    return this.leadRotationRulesService.remove(+id);
  }
}
