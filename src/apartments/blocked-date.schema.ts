import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type BlockedDateDocument = BlockedDate & Document;

@Schema({ timestamps: true })
export class BlockedDate {
  @Prop({ type: Types.ObjectId, ref: 'Apartment', required: true })
  apartmentId: Types.ObjectId;

  @Prop({ required: true })
  startDate: Date;

  @Prop({ required: true })
  endDate: Date;

  @Prop({ default: true })
  isActive: boolean;
}

export const BlockedDateSchema = SchemaFactory.createForClass(BlockedDate);

// Index for faster lookups
BlockedDateSchema.index({ apartmentId: 1, startDate: 1, endDate: 1 });
