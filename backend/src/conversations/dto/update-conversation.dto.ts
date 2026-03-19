import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class UpdateConversationDto {
  @ApiProperty({ example: 'Nuevo título', description: 'New conversation title', required: false })
  @IsString()
  @IsOptional()
  title?: string;
}
