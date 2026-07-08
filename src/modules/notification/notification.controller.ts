import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { NotificationService } from './notification.service';
import { JwtAuthGuard } from '../auth/guards';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../../common/enums';

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post('test-email')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send test email (Admin only)' })
  @ApiResponse({ status: 200, description: 'Test email sent successfully' })
  sendTestEmail(@Body('email') email: string) {
    return this.notificationService.sendTestEmail(email);
  }

  @Get('queue-stats')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get queue statistics (Admin only)' })
  @ApiResponse({ status: 200, description: 'Queue statistics retrieved successfully' })
  getQueueStats() {
    return this.notificationService.getQueueStats();
  }

  @Get('failed-jobs/:queueName')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get failed jobs from queue (Admin only)' })
  @ApiResponse({ status: 200, description: 'Failed jobs retrieved successfully' })
  getFailedJobs(@Param('queueName') queueName: string) {
    return this.notificationService.getFailedJobs(queueName);
  }

  @Post('retry-job/:queueName/:jobId')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Retry failed job (Admin only)' })
  @ApiResponse({ status: 200, description: 'Job retry initiated' })
  retryFailedJob(
    @Param('queueName') queueName: string,
    @Param('jobId') jobId: string,
  ) {
    return this.notificationService.retryFailedJob(queueName, jobId);
  }

  @Delete('clear-queue/:queueName')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clear queue (Admin only)' })
  @ApiResponse({ status: 200, description: 'Queue cleared successfully' })
  clearQueue(@Param('queueName') queueName: string) {
    return this.notificationService.clearQueue(queueName);
  }

  @Post('custom')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send custom notification (Admin only)' })
  @ApiResponse({ status: 200, description: 'Notification sent successfully' })
  sendCustomNotification(
    @Body() data: { to: string; subject: string; message: string },
  ) {
    return this.notificationService.sendCustomNotification(data);
  }
}
