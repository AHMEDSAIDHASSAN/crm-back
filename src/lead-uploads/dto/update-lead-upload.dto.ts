import { PartialType } from '@nestjs/swagger';
import { CreateLeadUploadDto } from './create-lead-upload.dto';

export class UpdateLeadUploadDto extends PartialType(CreateLeadUploadDto) { }
