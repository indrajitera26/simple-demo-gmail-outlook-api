import { ApiProperty } from '@nestjs/swagger';

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
}