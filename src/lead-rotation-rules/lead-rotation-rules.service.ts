import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';
import { CreateLeadRotationRuleDto } from './dto/create-lead-rotation-rule.dto';
import { UpdateLeadRotationRuleDto } from './dto/update-lead-rotation-rule.dto';

@Injectable()
export class LeadRotationRulesService {
  constructor(private prisma: PrismaService) { }

  async create(createLeadRotationRuleDto: CreateLeadRotationRuleDto) {
    return this.prisma.leadRotationRule.create({
      data: {
        ...createLeadRotationRuleDto,
        teamId: createLeadRotationRuleDto.teamId ? BigInt(createLeadRotationRuleDto.teamId) : null,
      },
    });
  }

  async findAll() {
    return this.prisma.leadRotationRule.findMany({
      include: {
        team: true,
      },
    });
  }

  async findOne(id: number) {
    const rule = await this.prisma.leadRotationRule.findUnique({
      where: { id },
      include: {
        team: true,
      },
    });

    if (!rule) {
      throw new NotFoundException(`Lead rotation rule with ID ${id} not found`);
    }

    return rule;
  }

  async update(id: number, updateLeadRotationRuleDto: UpdateLeadRotationRuleDto) {
    const { teamId, ...rest } = updateLeadRotationRuleDto;
    try {
      return await this.prisma.leadRotationRule.update({
        where: { id },
        data: {
          ...rest,
          ...(teamId && { teamId: BigInt(teamId) }),
        },
      });
    } catch (error) {
      throw new NotFoundException(`Lead rotation rule with ID ${id} not found`);
    }
  }

  async remove(id: number) {
    try {
      return await this.prisma.leadRotationRule.delete({
        where: { id },
      });
    } catch (error) {
      throw new NotFoundException(`Lead rotation rule with ID ${id} not found`);
    }
  }
}
