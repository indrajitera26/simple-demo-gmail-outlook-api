import { ApiProperty } from '@nestjs/swagger';

export class AttachmentDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  contentType: string;

  @ApiProperty()
  size: number;

  @ApiProperty()
  isInline: boolean;

  @ApiProperty({ required: false })
  isCalendarEvent?: boolean;

  @ApiProperty({ required: false })
  icsContent?: string;

  @ApiProperty({ required: false })
  parsedEvent?: {
    title?: string;
    startDate?: string;
    endDate?: string;
    location?: string;
    description?: string;
    organizer?: string;
  };
}

export class EmailResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  threadId: string;

  @ApiProperty()
  snippet: string;

  @ApiProperty()
  from: string;

  @ApiProperty()
  to: string;

  @ApiProperty()
  subject: string;

  @ApiProperty()
  date: string;

  @ApiProperty()
  body: string;

  @ApiProperty({ required: false })
  hasAttachments?: boolean;

  @ApiProperty({ type: [AttachmentDto], required: false })
  attachments?: AttachmentDto[];
}