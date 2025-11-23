import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { handleDbError } from '../helpers/handleDbError';
import { CreateReservationDto } from './dto/reservation.dto';
import { Reservation } from './reservation.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  PynbookingService,
  PynbookingConfirmPaidResponse,
} from '../pynbooking/pynbooking.service';

@Injectable()
export class ReservationService {
  constructor(
    @InjectModel(Reservation.name) private reservationModel: Model<Reservation>,
    private readonly pynbookingService: PynbookingService,
  ) {}
  async create(reservationDto: CreateReservationDto): Promise<Reservation> {
    let savedReservation: Reservation;

    try {
      const newReservation = new this.reservationModel(reservationDto);
      savedReservation = await newReservation.save();
    } catch (error) {
      handleDbError(error);
    }

    if (!savedReservation) {
      throw new InternalServerErrorException('Reservation could not be saved');
    }

    try {
      const hotelId = 523; // TODO Replace with your hotel ID
      const response: PynbookingConfirmPaidResponse =
        await this.pynbookingService.sendReservation(reservationDto, hotelId);

      console.log('Pynbooking bookingId:', response.bookingId);
    } catch (error) {
      throw new InternalServerErrorException(error);
    }

    return savedReservation;
  }

  async findByPaymentIntentId(paymentIntentId: string) {
    return this.reservationModel.findOne({ paymentIntentId });
  }
}
