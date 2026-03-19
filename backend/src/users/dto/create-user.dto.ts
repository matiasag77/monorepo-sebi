import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'user@example.com', description: 'User email address' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Password123!', description: 'User password', required: false })
  @IsString()
  @IsOptional()
  @MinLength(6)
  password?: string;

  @ApiProperty({ example: 'John Doe', description: 'User full name' })
  @IsString()
  name: string;

  @ApiProperty({ enum: ['admin', 'user'], default: 'user', required: false })
  @IsEnum(['admin', 'user'])
  @IsOptional()
  role?: string;

  @ApiProperty({ enum: ['local', 'google'], default: 'local', required: false })
  @IsEnum(['local', 'google'])
  @IsOptional()
  provider?: string;

  @ApiProperty({ required: false, description: 'Google ID for Google auth users' })
  @IsString()
  @IsOptional()
  googleId?: string;

  @ApiProperty({ required: false, description: 'User avatar URL' })
  @IsString()
  @IsOptional()
  avatar?: string;

  @ApiProperty({ default: true, required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
