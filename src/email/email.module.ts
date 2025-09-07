import { Module } from '@nestjs/common';
import { EmailController } from './email.controller';
import { OutlookController } from './outlook.controller';
import { EmailService } from './email.service';
import { GmailProvider } from './providers/gmail.provider';
import { OutlookProvider } from './providers/outlook.provider';

@Module({
  controllers: [EmailController, OutlookController],
  providers: [EmailService, GmailProvider, OutlookProvider],
  exports: [EmailService],
})
export class EmailModule {}