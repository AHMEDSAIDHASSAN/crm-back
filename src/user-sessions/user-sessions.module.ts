import { Module } from '@nestjs/common';
import { UserSessionsService } from './user-sessions.service';
import { UserSessionsController } from './user-sessions.controller';

@Module({
  controllers: [UserSessionsController],
  providers: [UserSessionsService],
})
export class UserSessionsModule {}
