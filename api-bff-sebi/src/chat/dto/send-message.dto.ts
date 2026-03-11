import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class SendMessageDto {
  @ApiProperty({ required: false, description: 'Conversation ID (optional, creates new if not provided)' })
  @IsString()
  @IsOptional()
  conversationId?: string;

  @ApiProperty({ example: '¿Cómo estuvieron las ventas?', description: 'Message content to send' })
  @IsString()
  content: string;
}
