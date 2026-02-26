import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PriceOverrideDocument = PriceOverride & Document;

@Schema({ timestamps: true })
export class PriceOverride {
  @Prop({ type: Types.ObjectId, ref: 'Apartment', required: true })
  apartmentId: Types.ObjectId;

  @Prop({ required: true })
  startDate: Date;

  @Prop({ required: true })
  endDate: Date;

  @Prop({ required: true })
  price: number;

  @Prop({ default: 'RON', uppercase: true })
  currency: string;

  @Prop({ default: true })
  isActive: boolean;
}

export const PriceOverrideSchema = SchemaFactory.createForClass(PriceOverride);

// Index for faster lookups
PriceOverrideSchema.index({ apartmentId: 1, startDate: 1, endDate: 1 });
