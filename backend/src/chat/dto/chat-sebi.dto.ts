import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength } from 'class-validator';

export class ChatSebiDto {
  @ApiProperty({ example: '¿Cómo estuvieron las ventas?', description: 'Mensaje del usuario' })
  @IsString()
  @MaxLength(5000)
  message: string;

  @ApiProperty({ example: 'user@example.com', required: false, description: 'Email del usuario' })
  @IsString()
  @IsOptional()
  email?: string;

  @ApiProperty({ example: 'session-1234567890', required: false, description: 'ID de sesión ADK' })
  @IsString()
  @IsOptional()
  session_id?: string;

  @ApiProperty({ example: 'user-123', required: false, description: 'ID del usuario' })
  @IsString()
  @IsOptional()
  user_id?: string;
}
