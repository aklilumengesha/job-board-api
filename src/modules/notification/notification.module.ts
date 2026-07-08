import { Module } from '@nestjs/common';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import {
  JobNotificationProcessor,
  ApplicationNotificationProcessor,
} from './processors';

@Module({
  controllers: [NotificationController],
  providers: [
    NotificationService,
    JobNotificationProcessor,
    ApplicationNotificationProcessor,
  ],
  exports: [NotificationService],
})
export class NotificationModule {}
