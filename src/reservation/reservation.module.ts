import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Reservation, ReservationSchema } from './reservation.schema';
import { ReservationService } from './reservation.service';
import { ReservationController } from './reservation.controller';
import { PynbookingService } from '../pynbooking/pynbooking.service';
import { HttpModule } from '@nestjs/axios';
import { RoomLockModule } from '../room-lock/room-lock.module';
import { BlockedDate, BlockedDateSchema } from '../apartments/blocked-date.schema';
import { Apartment, ApartmentSchema } from '../apartments/apartment.schema';
import { PriceOverride, PriceOverrideSchema } from '../apartments/price-override.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Reservation.name, schema: ReservationSchema },
      { name: BlockedDate.name, schema: BlockedDateSchema },
      { name: Apartment.name, schema: ApartmentSchema },
      { name: PriceOverride.name, schema: PriceOverrideSchema },
    ]),
    HttpModule,
    RoomLockModule,
  ],
  providers: [ReservationService, PynbookingService],
  controllers: [ReservationController],
  exports: [ReservationService, PynbookingService],
})
export class ReservationModule {}
