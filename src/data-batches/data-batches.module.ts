import { Module } from '@nestjs/common';
import { DataBatchesService } from './data-batches.service';
import { DataBatchesController } from './data-batches.controller';
import { RolesGuard } from '../auth/guards/roles.guard';

@Module({
  controllers: [DataBatchesController],
  providers: [DataBatchesService, RolesGuard],
})
export class DataBatchesModule {}
