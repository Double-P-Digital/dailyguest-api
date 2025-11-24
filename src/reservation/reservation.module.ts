import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Reservation, ReservationSchema } from './reservation.schema';
import { ReservationService } from './reservation.service';
import { ReservationController } from './reservation.controller';
import { PynbookingService } from '../pynbooking/pynbooking.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Reservation.name, schema: ReservationSchema },
    ]),
    HttpModule,
  ],
  providers: [ReservationService, PynbookingService],
  controllers: [ReservationController],
  exports: [ReservationService, PynbookingService],
})
export class ReservationModule {}
