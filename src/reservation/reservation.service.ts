import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { CreateReservationDto } from './dto/reservation.dto';
import { Reservation } from './reservation.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PynbookingService } from '../pynbooking/pynbooking.service';
import { PynbookingConfirmPaidResponse } from '../pynbooking/types';

@Injectable()
export class ReservationService {
  constructor(
    @InjectModel(Reservation.name) private reservationModel: Model<Reservation>,
    private readonly pynbookingService: PynbookingService,
  ) {}
  async create(
    reservationDto: CreateReservationDto,
  ): Promise<PynbookingConfirmPaidResponse> {
    try {
      const hotelId = 523; // TODO Replace with your hotel ID
      return await this.pynbookingService.sendReservation(
        reservationDto,
        hotelId,
      );
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  async findByPaymentIntentId(paymentIntentId: string) {
    return this.reservationModel.findOne({ paymentIntentId });
  }
}
