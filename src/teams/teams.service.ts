import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';
import { getVisibleTeamIds } from '../common/subordinates.helper';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';

@Injectable()
export class TeamsService {
  constructor(private prisma: PrismaService) { }

  create(createTeamDto: CreateTeamDto) {
    return this.prisma.team.create({
      data: createTeamDto,
      include: {
        teamLeader: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  findAll(viewerId: number, viewerRole: string) {
    return this.findAllScoped(viewerId, viewerRole);
  }

  private async findAllScoped(viewerId: number, viewerRole: string) {
    const visible = await getVisibleTeamIds(this.prisma, viewerId, viewerRole);
    const where = visible === null ? {} : { id: { in: visible } };
    return this.prisma.team.findMany({
      where,
      include: {
        teamLeader: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        _count: {
          select: {
            members: true,
            leads: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  private readonly memberLeadSelect = {
    id: true,
    firstName: true,
    lastName: true,
    phone: true,
    email: true,
    status: true,
    priority: true,
    assignedAt: true,
    updatedAt: true,
  } as const;

  private async loadTeamWithDetails(teamId: bigint) {
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
      include: {
        teamLeader: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            assignedLeads: {
              where: { teamId: teamId },
              orderBy: { updatedAt: 'desc' },
              select: this.memberLeadSelect,
            },
          },
        },
        members: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            title: true,
            status: true,
            assignedLeads: {
              where: { teamId: teamId },
              orderBy: { updatedAt: 'desc' },
              select: this.memberLeadSelect,
            },
          },
        },
        _count: {
          select: {
            leads: true,
          },
        },
      },
    });
    if (!team) {
      throw new NotFoundException(`Team with ID ${teamId} not found`);
    }
    return team;
  }

  async findOne(id: number, viewerId: number, viewerRole: string) {
    const teamId = BigInt(id);
    const visible = await getVisibleTeamIds(this.prisma, viewerId, viewerRole);
    if (visible !== null && !visible.includes(teamId)) {
      throw new ForbiddenException('You cannot view this team');
    }
    return this.loadTeamWithDetails(teamId);
  }

  async update(id: number, updateTeamDto: UpdateTeamDto) {
    await this.loadTeamWithDetails(BigInt(id));

    return this.prisma.team.update({
      where: { id },
      data: updateTeamDto,
      include: {
        teamLeader: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  async remove(id: number) {
    await this.loadTeamWithDetails(BigInt(id));

    return this.prisma.team.delete({
      where: { id },
    });
  }
}
