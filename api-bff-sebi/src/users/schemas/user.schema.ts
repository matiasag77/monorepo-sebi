import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @ApiProperty({ example: 'user@example.com' })
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: false })
  password?: string;

  @ApiProperty({ example: 'John Doe' })
  @Prop({ required: true, trim: true })
  name: string;

  @ApiProperty({ enum: ['admin', 'user'], default: 'user' })
  @Prop({ type: String, enum: ['admin', 'user'], default: 'user' })
  role: string;

  @ApiProperty({ enum: ['local', 'google'], default: 'local' })
  @Prop({ type: String, enum: ['local', 'google'], default: 'local' })
  provider: string;

  @ApiProperty({ required: false })
  @Prop({ required: false })
  googleId?: string;

  @ApiProperty({ required: false })
  @Prop({ required: false })
  avatar?: string;

  @ApiProperty({ default: true })
  @Prop({ default: true })
  isActive: boolean;

  @ApiProperty({ required: false })
  @Prop({ required: false })
  lastLoginAt?: Date;

  @ApiProperty({ default: 0 })
  @Prop({ default: 0 })
  loginCount: number;
}

export const UserSchema = SchemaFactory.createForClass(User);
