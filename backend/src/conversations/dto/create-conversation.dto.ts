import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class CreateConversationDto {
  @ApiProperty({ example: 'Análisis de ventas Q4', description: 'Conversation title' })
  @IsString()
  title: string;

  @ApiProperty({ required: false, description: 'Initial message (optional)' })
  @IsString()
  @IsOptional()
  initialMessage?: string;
}
