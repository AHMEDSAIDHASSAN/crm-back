import { Module } from '@nestjs/common';
import { CalculatorService } from './calculator.service';
import { CalculatorController } from './calculator.controller';

@Module({
  controllers: [CalculatorController],
  providers: [CalculatorService],
})
export class CalculatorModule {}
