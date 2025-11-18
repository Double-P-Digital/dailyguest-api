import { Injectable } from '@nestjs/common';
import { handleDbError } from '../helpers/handleDbError';
import { CreateReservationDto } from './dto/reservation.dto';
import { Reservation } from './reservation.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Injectable()
export class ReservationService {
  constructor(
    @InjectModel(Reservation.name) private reservationModel: Model<Reservation>,
  ) {}

  async create(reservationDto: CreateReservationDto): Promise<Reservation> {
    try {
      const newReservation = new this.reservationModel(reservationDto);

      return await newReservation.save();
    } catch (error) {
      handleDbError(error);
    }
  }

  async findByPaymentIntentId(paymentIntentId: string) {
    return this.reservationModel.findOne({ paymentIntentId });
  }
}
