import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

@Schema()
export class Apartment {
  @Prop({ required: true })
  hotelId: string;

  @Prop({ required: true })
  roomType: string;

  @Prop({ required: true })
  roomId: string;

  @Prop({ required: true })
  name: string;

  @Prop()
  price: number;

  @Prop()
  maxGuests: number;

  @Prop()
  bedrooms: number;

  @Prop()
  bathrooms: number;

  @Prop()
  address: string;

  @Prop()
  city: string;

  @Prop({
    type: {
      latitude: Number,
      longitude: Number,
    },
    required: true,
  })
  coordinates: {
    latitude: number;
    longitude: number;
  };

  @Prop()
  descriptionEn: string;

  @Prop()
  descriptionRo: string;

  @Prop([String])
  amenities: string[];

  @Prop([String])
  images: string[];

  @Prop({ type: Types.ObjectId, ref: 'DiscountCode', nullable: true })
  discountCode?: Types.ObjectId;

  @Prop()
  status: string;

  @Prop()
  stripeAccountId: string;

  @Prop({ default: 0, index: true })
  displayOrder: number;
}

export const ApartmentSchema = SchemaFactory.createForClass(Apartment);
