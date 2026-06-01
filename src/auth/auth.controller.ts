import { Controller, Post, Get, Body, HttpCode, HttpStatus, UseGuards, Request, Query } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) { }

    /**
     * Without query: current user (unchanged).
     * With ?memberSalesUserId=123: sales KPIs for that user (access enforced in UsersService). Same path avoids proxy 404 on new URLs.
     */
    @Get('profile')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({
        summary:
            'Get current user profile, or member sales overview via memberSalesUserId; optional withProfileLeads=1 adds profileLeads bundle',
    })
    async getProfile(
        @Request() req: any,
        @Query('memberSalesUserId') memberSalesUserId?: string,
        @Query('withProfileLeads') withProfileLeads?: string,
        @Query('performanceRange') performanceRange?: string,
        @Query('leadsCurrentPage') leadsCurrentPage?: string,
        @Query('leadsPriorPage') leadsPriorPage?: string,
        @Query('leadsLimitCurrent') leadsLimitCurrent?: string,
        @Query('leadsLimitPrior') leadsLimitPrior?: string,
    ) {
        if (memberSalesUserId != null && memberSalesUserId !== '' && /^\d+$/.test(memberSalesUserId.trim())) {
            const targetId = Number(memberSalesUserId);
            const rangeRaw = String(performanceRange ?? 'all').trim().toLowerCase();
            const range: 'all' | 'week' | 'month' | 'year' =
                rangeRaw === 'week' || rangeRaw === 'month' || rangeRaw === 'year' ? rangeRaw : 'all';
            const overview = await this.authService.getMemberSalesOverview(
                targetId,
                Number(req.user.userId),
                req.user.role,
                range,
            );
            const wantLeads = withProfileLeads === '1' || withProfileLeads === 'true';
            if (wantLeads) {
                const bundle = await this.authService.getMemberProfileLeads(
                    targetId,
                    Number(req.user.userId),
                    req.user.role,
                    Math.max(1, parseInt(String(leadsCurrentPage ?? '1'), 10) || 1),
                    Math.max(1, parseInt(String(leadsPriorPage ?? '1'), 10) || 1),
                    Math.min(500, Math.max(1, parseInt(String(leadsLimitCurrent ?? '200'), 10) || 200)),
                    Math.min(100, Math.max(1, parseInt(String(leadsLimitPrior ?? '10'), 10) || 10)),
                );
                return { ...overview, profileLeads: bundle };
            }
            return overview;
        }
        return this.authService.getProfile(Number(req.user.userId));
    }

    @Post('login')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'User login' })
    async login(@Body() loginDto: LoginDto) {
        return this.authService.login(loginDto);
    }

    @Post('register')
    @ApiOperation({ summary: 'User registration' })
    async register(@Body() registerDto: RegisterDto) {
        return this.authService.register(registerDto);
    }
    @Post('logout')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'User logout' })
    async logout() {
        return { message: 'Logged out successfully' };
    }
}
