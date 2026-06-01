import { Module } from '@nestjs/common';
import { ResaleUnitsService } from './resale-units.service';
import { ResaleUnitsController } from './resale-units.controller';

@Module({
  controllers: [ResaleUnitsController],
  providers: [ResaleUnitsService],
})
export class ResaleUnitsModule {}
