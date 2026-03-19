import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export type SuggestionDocument = Suggestion & Document;

@Schema({ timestamps: true })
export class Suggestion {
  @ApiProperty({ description: 'Texto de la sugerencia' })
  @Prop({ required: true, trim: true })
  text: string;

  @ApiProperty({ description: 'Categoría de la sugerencia', default: 'general' })
  @Prop({ type: String, default: 'general', trim: true })
  category: string;

  @ApiProperty({ description: 'Si es una sugerencia por defecto del sistema' })
  @Prop({ default: false })
  isDefault: boolean;

  @ApiProperty({ description: 'ID del usuario que creó la sugerencia (null si es por defecto)' })
  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  userId?: Types.ObjectId;

  @ApiProperty({ description: 'Si la sugerencia está activa' })
  @Prop({ default: true })
  isActive: boolean;

  @ApiProperty({ description: 'Orden de prioridad (menor = más prioritario)' })
  @Prop({ default: 0 })
  order: number;
}

export const SuggestionSchema = SchemaFactory.createForClass(Suggestion);

SuggestionSchema.index({ userId: 1, isActive: 1 });
SuggestionSchema.index({ isDefault: 1, isActive: 1 });
