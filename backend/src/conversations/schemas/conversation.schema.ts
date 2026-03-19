import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export type ConversationDocument = Conversation & Document;

@Schema({ _id: false })
export class Message {
  @ApiProperty({ enum: ['user', 'assistant'] })
  @Prop({ type: String, enum: ['user', 'assistant'], required: true })
  role: string;

  @ApiProperty()
  @Prop({ required: true })
  content: string;

  @ApiProperty()
  @Prop({ default: () => new Date() })
  timestamp: Date;
}

export const MessageSchema = SchemaFactory.createForClass(Message);

@Schema({ timestamps: true })
export class Conversation {
  @ApiProperty({ example: 'Análisis de ventas Q4' })
  @Prop({ required: true, trim: true })
  title: string;

  @ApiProperty({ description: 'User ID reference' })
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @ApiProperty({ type: [Message] })
  @Prop({ type: [MessageSchema], default: [] })
  messages: Message[];

  @ApiProperty({ required: false })
  @Prop({ required: false })
  lastMessage?: string;
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);

ConversationSchema.index({ userId: 1, updatedAt: -1 });
