import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema()
export class DiscountCode {
  @Prop({ unique: true, required: true })
  code: string;

  @Prop()
  percentage: number;

  @Prop()
  expirationDate: Date;
}

export const DiscountCodeSchema = SchemaFactory.createForClass(DiscountCode);
