import { Module } from '@nestjs/common';
import { ApartmentService } from './apartment.service';
import { ApartmentController } from './apartment.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Apartment, ApartmentSchema } from './apartment.schema';
import { Reservation, ReservationSchema } from '../reservation/reservation.schema';
import { BlockedDate, BlockedDateSchema } from './blocked-date.schema';
import { PriceOverride, PriceOverrideSchema } from './price-override.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Apartment.name,
        schema: ApartmentSchema,
      },
      {
        name: Reservation.name,
        schema: ReservationSchema,
      },
      {
        name: BlockedDate.name,
        schema: BlockedDateSchema,
      },
      {
        name: PriceOverride.name,
        schema: PriceOverrideSchema,
      },
    ]),
  ],
  controllers: [ApartmentController],
  providers: [ApartmentService],
  exports: [ApartmentService],
})
export class ApartmentModule {}
