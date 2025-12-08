import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, Document } from 'mongoose';
import { Apartment } from '../apartments/apartment.schema';

@Schema({ timestamps: true })
export class Reservation extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Apartment', required: false })
  apartment?: Apartment | Types.ObjectId;

  @Prop({ required: true })
  guestName: string;

  @Prop({ required: true })
  guestEmail: string;

  @Prop({ required: true })
  checkInDate: Date;

  @Prop({ required: true })
  checkOutDate: Date;

  @Prop({ default: 1 })
  guestsCount: number;

  @Prop({ required: true })
  totalPrice: number;

  @Prop({ required: true })
  currency: string;

  @Prop({ required: true, unique: true })
  paymentIntentId: string;

  @Prop({ default: 'pending', enum: ['pending', 'confirmed', 'cancelled'] })
  status: string;

  @Prop()
  externalBookingId: string;

  @Prop({ default: false })
  syncFailed: boolean;

  @Prop()
  syncError: string;
}

export const ReservationSchema = SchemaFactory.createForClass(Reservation);
