import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export type TrackingEventDocument = TrackingEvent & Document;

@Schema({ timestamps: true })
export class TrackingEvent {
  @ApiProperty({ description: 'User ID reference' })
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @ApiProperty({
    enum: [
      'login',
      'logout',
      'chat_message',
      'view_history',
      'create_conversation',
      'delete_conversation',
    ],
  })
  @Prop({
    type: String,
    enum: [
      'login',
      'logout',
      'chat_message',
      'view_history',
      'create_conversation',
      'delete_conversation',
    ],
    required: true,
  })
  action: string;

  @ApiProperty({ required: false, description: 'Additional event metadata' })
  @Prop({ type: MongooseSchema.Types.Mixed, required: false })
  metadata?: Record<string, any>;

  @ApiProperty({ required: false })
  @Prop({ required: false })
  ip?: string;

  @ApiProperty({ required: false })
  @Prop({ required: false })
  userAgent?: string;
}

export const TrackingEventSchema = SchemaFactory.createForClass(TrackingEvent);
