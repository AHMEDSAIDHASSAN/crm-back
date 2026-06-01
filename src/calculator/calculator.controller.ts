import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CalculatorService } from './calculator.service';
import { CalculateDto } from './dto/calculate.dto';

@ApiTags('Calculator')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('calculator')
export class CalculatorController {
  constructor(private readonly svc: CalculatorService) {}

  @Post('calculate')
  @ApiOperation({ summary: 'Run installment / financing calculation' })
  calculate(@Body() dto: CalculateDto) {
    return this.svc.calculate(dto);
  }
}
