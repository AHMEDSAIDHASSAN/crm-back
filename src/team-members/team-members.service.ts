import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';
import { CreateTeamMemberDto } from './dto/create-team-member.dto';
import { UpdateTeamMemberDto } from './dto/update-team-member.dto';

@Injectable()
export class TeamMembersService {
  constructor(private prisma: PrismaService) { }

  async create(createTeamMemberDto: CreateTeamMemberDto) {
    return this.prisma.teamMember.create({
      data: {
        ...createTeamMemberDto,
        teamId: BigInt(createTeamMemberDto.teamId),
        userId: BigInt(createTeamMemberDto.userId),
      },
    });
  }

  async findAll() {
    return this.prisma.teamMember.findMany({
      include: {
        team: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  async findOne(id: number) {
    const member = await this.prisma.teamMember.findUnique({
      where: { id: BigInt(id) },
      include: {
        team: true,
        user: true,
      },
    });

    if (!member) {
      throw new NotFoundException(`Team member with ID ${id} not found`);
    }

    return member;
  }

  async update(id: number, updateTeamMemberDto: UpdateTeamMemberDto) {
    const { teamId, userId, ...rest } = updateTeamMemberDto;
    try {
      return await this.prisma.teamMember.update({
        where: { id: BigInt(id) },
        data: {
          ...rest,
          ...(teamId && { teamId: BigInt(teamId) }),
          ...(userId && { userId: BigInt(userId) }),
        },
      });
    } catch (error) {
      throw new NotFoundException(`Team member with ID ${id} not found`);
    }
  }

  async remove(id: number) {
    try {
      return await this.prisma.teamMember.delete({
        where: { id: BigInt(id) },
      });
    } catch (error) {
      throw new NotFoundException(`Team member with ID ${id} not found`);
    }
  }

  async leaveTeam(id: number) {
    return this.prisma.teamMember.update({
      where: { id: BigInt(id) },
      data: { leftAt: new Date() },
    });
  }
}
