import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

@Schema()
export class DiscountCode {
  @Prop({ unique: true, required: true })
  code: string;

  @Prop({ required: true })
  price: number;

  @Prop({ required: true, default: 'EUR' })
  currency: string;

  @Prop({ required: true })
  expirationDate: Date;
  
  @Prop({ type: [{ type: Types.ObjectId, ref: 'Apartment' }], required: true })
  apartmentIds: Types.ObjectId[];
}

export const DiscountCodeSchema = SchemaFactory.createForClass(DiscountCode);
