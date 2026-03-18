import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsIn, MaxLength } from 'class-validator';

export class SendMessageDto {
  @ApiProperty({ required: false, description: 'Conversation ID (optional, creates new if not provided)' })
  @IsString()
  @IsOptional()
  conversationId?: string;

  @ApiProperty({ example: '¿Cómo estuvieron las ventas?', description: 'Message content to send' })
  @IsString()
  @MaxLength(5000)
  content: string;

  @ApiProperty({
    required: false,
    enum: ['skelligen', 'adk'],
    description: 'AI provider to use (defaults to env AI_PROVIDER or skelligen)',
  })
  @IsString()
  @IsIn(['skelligen', 'adk'])
  @IsOptional()
  provider?: 'skelligen' | 'adk';
}
