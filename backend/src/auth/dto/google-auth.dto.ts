import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail, IsOptional } from 'class-validator';

export class GoogleAuthDto {
  @ApiProperty({ description: 'User email from Google' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'User full name from Google' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Google account ID' })
  @IsString()
  googleId: string;

  @ApiProperty({ description: 'User avatar URL', required: false })
  @IsString()
  @IsOptional()
  avatar?: string;
}
