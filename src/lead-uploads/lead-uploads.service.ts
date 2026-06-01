import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';
import { CreateLeadUploadDto } from './dto/create-lead-upload.dto';
import { UpdateLeadUploadDto } from './dto/update-lead-upload.dto';

@Injectable()
export class LeadUploadsService {
  constructor(private prisma: PrismaService) { }

  async create(createLeadUploadDto: CreateLeadUploadDto) {
    return this.prisma.leadUpload.create({
      data: {
        ...createLeadUploadDto,
        uploadedBy: BigInt(createLeadUploadDto.uploadedBy),
        dataBatchId: createLeadUploadDto.dataBatchId ? BigInt(createLeadUploadDto.dataBatchId) : null,
      },
    });
  }

  async findAll() {
    return this.prisma.leadUpload.findMany({
      include: {
        uploader: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        dataBatch: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    const upload = await this.prisma.leadUpload.findUnique({
      where: { id: BigInt(id) },
      include: {
        uploader: true,
        dataBatch: true,
      },
    });

    if (!upload) {
      throw new NotFoundException(`Lead upload with ID ${id} not found`);
    }

    return upload;
  }

  async update(id: number, updateLeadUploadDto: UpdateLeadUploadDto) {
    const { uploadedBy, dataBatchId, ...rest } = updateLeadUploadDto;
    try {
      return await this.prisma.leadUpload.update({
        where: { id: BigInt(id) },
        data: {
          ...rest,
          ...(uploadedBy && { uploadedBy: BigInt(uploadedBy) }),
          ...(dataBatchId && { dataBatchId: BigInt(dataBatchId) }),
        },
      });
    } catch (error) {
      throw new NotFoundException(`Lead upload with ID ${id} not found`);
    }
  }

  async remove(id: number) {
    try {
      return await this.prisma.leadUpload.delete({
        where: { id: BigInt(id) },
      });
    } catch (error) {
      throw new NotFoundException(`Lead upload with ID ${id} not found`);
    }
  }
}
