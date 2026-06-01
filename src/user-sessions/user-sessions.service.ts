import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';
import { CreateUserSessionDto } from './dto/create-user-session.dto';
import { UpdateUserSessionDto } from './dto/update-user-session.dto';

@Injectable()
export class UserSessionsService {
  constructor(private prisma: PrismaService) { }

  async create(createUserSessionDto: CreateUserSessionDto) {
    return this.prisma.userSession.create({
      data: {
        ...createUserSessionDto,
        userId: BigInt(createUserSessionDto.userId),
      },
    });
  }

  async findAll() {
    return this.prisma.userSession.findMany({
      include: {
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
    const session = await this.prisma.userSession.findUnique({
      where: { id: BigInt(id) },
      include: {
        user: true,
      },
    });

    if (!session) {
      throw new NotFoundException(`User session with ID ${id} not found`);
    }

    return session;
  }

  async update(id: number, updateUserSessionDto: UpdateUserSessionDto) {
    const { userId, ...rest } = updateUserSessionDto;
    try {
      return await this.prisma.userSession.update({
        where: { id: BigInt(id) },
        data: {
          ...rest,
          ...(userId && { userId: BigInt(userId) }),
        },
      });
    } catch (error) {
      throw new NotFoundException(`User session with ID ${id} not found`);
    }
  }

  async remove(id: number) {
    try {
      return await this.prisma.userSession.delete({
        where: { id: BigInt(id) },
      });
    } catch (error) {
      throw new NotFoundException(`User session with ID ${id} not found`);
    }
  }

  async revokeSession(token: string) {
    return this.prisma.userSession.updateMany({
      where: { sessionToken: token },
      data: { expiresAt: new Date() },
    });
  }
}
