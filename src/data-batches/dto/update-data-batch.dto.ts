import { PartialType } from '@nestjs/swagger';
import { CreateDataBatchDto } from './create-data-batch.dto';

export class UpdateDataBatchDto extends PartialType(CreateDataBatchDto) { }
