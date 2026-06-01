import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { User } from '@prisma/client';

@Injectable()
export class AuthService {
    constructor(
        private usersService: UsersService,
        private jwtService: JwtService,
    ) { }

    async validateUser(email: string, pass: string): Promise<any> {
        const user = await this.usersService.findByEmail(email);
        if (user && (await bcrypt.compare(pass, user.passwordHash))) {
            const { passwordHash, ...result } = user;
            return result;
        }
        return null;
    }

    async login(loginDto: LoginDto) {
        const validatedUser = await this.validateUser(loginDto.email, loginDto.password);
        if (!validatedUser) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const payload = {
            email: validatedUser.email,
            sub: validatedUser.id.toString(),
            role: validatedUser.role?.name || 'sales'
        };
        return {
            access_token: this.jwtService.sign(payload),
            user: validatedUser,
        };
    }

    async getProfile(userId: number) {
        return this.usersService.findOne(userId);
    }

    /** Leads/meetings KPIs for a user; access enforced in UsersService (sales = self only, etc.). */
    async getMemberSalesOverview(
        targetUserId: number,
        viewerUserId: number,
        viewerRole: string,
        performanceRange: 'all' | 'week' | 'month' | 'year' = 'all',
    ) {
        return this.usersService.getSalesOverview(targetUserId, viewerUserId, viewerRole, performanceRange);
    }

    /** Paginated current + prior assigned leads in one response (profile page). */
    async getMemberProfileLeads(
        targetUserId: number,
        viewerUserId: number,
        viewerRole: string,
        currentPage: number,
        priorPage: number,
        limitCurrent: number,
        limitPrior: number,
    ) {
        return this.usersService.getProfileLeadsBundle(
            targetUserId,
            viewerUserId,
            viewerRole,
            currentPage,
            priorPage,
            limitCurrent,
            limitPrior,
        );
    }

    async register(registerDto: RegisterDto) {
        let roleId = registerDto.roleId;

        if (!roleId) {
            const defaultRole = await this.usersService.findRoleByName('sales');
            roleId = defaultRole?.id || 6; // Fallback to 6 if 'sales' doesn't exist
        }

        return this.usersService.create({
            ...registerDto,
            roleId,
        } as any);
    }
}
