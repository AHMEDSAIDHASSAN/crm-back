import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/guards/roles.guard';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('super_admin', 'operation_manager', 'sales_manager', 'tech_lead')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @Post()
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all users with pagination' })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  findAll(
    @Request() req: { user: { userId: string; role: string } },
    @Query() paginationDto: PaginationDto,
  ) {
    return this.usersService.findAll(
      paginationDto,
      Number(req.user.userId),
      req.user.role,
    );
  }

  @Get('role/:roleName')
  @ApiOperation({ summary: 'Get users by role name' })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  findByRole(
    @Request() req: { user: { userId: string; role: string } },
    @Param('roleName') roleName: string,
  ) {
    return this.usersService.findByRole(
      roleName,
      Number(req.user.userId),
      req.user.role,
    );
  }

  @Get('scoped/team-assignees')
  @ApiOperation({ summary: 'Tech leads and sales users visible for team assignment (hierarchy-scoped)' })
  @ApiResponse({ status: 200, description: 'Lists retrieved successfully' })
  findScopedTeamAssignees(@Request() req: { user: { userId: string; role: string } }) {
    return this.usersService.findScopedTeamAssignees(Number(req.user.userId), req.user.role);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, description: 'User found' })
  @ApiResponse({ status: 404, description: 'User not found' })
  findOne(
    @Request() req: { user: { userId: string; role: string } },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.usersService.findOneForViewer(
      id,
      Number(req.user.userId),
      req.user.role,
    );
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  update(
    @Request() req: { user: { userId: string; role: string } },
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.update(id, updateUserDto, Number(req.user.userId), req.user.role);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete user' })
  @ApiResponse({ status: 204, description: 'User deleted successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  remove(
    @Request() req: { user: { userId: string; role: string } },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.usersService.remove(id, Number(req.user.userId), req.user.role);
  }
}
