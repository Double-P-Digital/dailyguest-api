import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type RoomLockDocument = RoomLock & Document;

@Schema({ timestamps: true })
export class RoomLock {
  @Prop({ required: true })
  roomType: string;

  @Prop({ required: true })
  checkInDate: Date;

  @Prop({ required: true })
  checkOutDate: Date;

  @Prop({ required: true, unique: true })
  paymentIntentId: string;

  @Prop({ required: true })
  expiresAt: Date;

  @Prop()
  guestName?: string;

  @Prop()
  guestEmail?: string;

  @Prop()
  guestPhone?: string;

  @Prop()
  apartmentId?: string;
}

export const RoomLockSchema = SchemaFactory.createForClass(RoomLock);

// TTL index - MongoDB will automatically delete documents when expiresAt is reached
RoomLockSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Compound index for faster lookup
RoomLockSchema.index({ roomType: 1, checkInDate: 1, checkOutDate: 1 });



