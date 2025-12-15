import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

export enum DiscountType {
  FIXED = 'FIXED',
  PERCENTAGE = 'PERCENTAGE',
}

@Schema()
export class DiscountCode {
  @Prop({ unique: true, required: true })
  code: string;

  @Prop({ required: true, enum: DiscountType, default: DiscountType.FIXED })
  discountType: DiscountType;

  @Prop({ required: true })
  value: number; // Preț fix sau procentaj (0-100)

  @Prop({ required: true, default: 'RON' })
  currency: string;

  @Prop({ required: true })
  expirationDate: Date;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Apartment' }], required: true })
  apartmentIds: Types.ObjectId[];
}

export const DiscountCodeSchema = SchemaFactory.createForClass(DiscountCode);
