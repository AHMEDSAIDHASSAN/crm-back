import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PerformanceService } from './performance.service';

@ApiTags('Performance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('performance')
export class PerformanceController {
  constructor(private readonly performanceService: PerformanceService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Per-user sales metrics for everyone in the viewer’s hierarchy' })
  getOverview(@Request() req: { user: { userId: string; role: string } }) {
    return this.performanceService.getOverview(Number(req.user.userId), req.user.role);
  }
}
