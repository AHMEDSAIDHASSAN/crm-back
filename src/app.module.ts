import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './config/prisma.module';
import { TeamsModule } from './teams/teams.module';
import { RolesModule } from './roles/roles.module';
import { LeadsModule } from './leads/leads.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { MeetingsModule } from './meetings/meetings.module';
import { UnitsModule } from './units/units.module';
import { ResaleUnitsModule } from './resale-units/resale-units.module';
import { CallsModule } from './calls/calls.module';
import { WhatsappModule } from './whatsapp/whatsapp.module';
import { AttendanceModule } from './attendance/attendance.module';
import { NotificationsModule } from './notifications/notifications.module';
import { SettingsModule } from './settings/settings.module';
import { AuditModule } from './audit/audit.module';
import { UsersModule } from './users/users.module';
import { LeadSourcesModule } from './lead-sources/lead-sources.module';
import { LeadFeedbackModule } from './lead-feedback/lead-feedback.module';
import { LeadUploadsModule } from './lead-uploads/lead-uploads.module';
import { UserSessionsModule } from './user-sessions/user-sessions.module';
import { TeamMembersModule } from './team-members/team-members.module';
import { LeadAssignmentsModule } from './lead-assignments/lead-assignments.module';
import { LeadRotationRulesModule } from './lead-rotation-rules/lead-rotation-rules.module';
import { LeadAutoRetractionsModule } from './lead-auto-retractions/lead-auto-retractions.module';
import { DataBatchesModule } from './data-batches/data-batches.module';
import { AuthModule } from './auth/auth.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { HrModule } from './hr/hr.module';
import { UnitPreviewsModule } from './unit-previews/unit-previews.module';
import { CalculatorModule } from './calculator/calculator.module';
import { FinanceModule } from './finance/finance.module';
import { PerformanceModule } from './performance/performance.module';
import { WhatsAppWebModule } from './whatsapp-web/whatsapp-web.module';

@Module({
  imports: [ScheduleModule.forRoot(), PrismaModule, UsersModule, TeamsModule, RolesModule, LeadsModule, CampaignsModule, MeetingsModule, UnitsModule, ResaleUnitsModule, CallsModule, WhatsappModule, AttendanceModule, NotificationsModule, SettingsModule, AuditModule, LeadSourcesModule, LeadFeedbackModule, LeadUploadsModule, UserSessionsModule, TeamMembersModule, LeadAssignmentsModule, LeadRotationRulesModule, LeadAutoRetractionsModule, DataBatchesModule, AuthModule, WebhooksModule, DashboardModule, HrModule, UnitPreviewsModule, CalculatorModule, FinanceModule, PerformanceModule, WhatsAppWebModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
