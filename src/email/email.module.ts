import { Module } from '@nestjs/common';
import { EmailController } from './email.controller';
import { EmailService } from './email.service';
import { GmailProvider } from './providers/gmail.provider';

@Module({
  controllers: [EmailController],
  providers: [EmailService, GmailProvider],
  exports: [EmailService],
})
export class EmailModule {}