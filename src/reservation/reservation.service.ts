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
      return await this.pynbookingService.sendReservation(
        reservationDto
      );
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  async findByPaymentIntentId(paymentIntentId: string) {
    return this.reservationModel.findOne({ paymentIntentId });
  }

  async topApartments(): Promise<{ apartmentId: string; count: number }[]> {
    const result = await this.reservationModel.aggregate([
      { $group: { _id: '$apartmentId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
      { $project: { _id: 0, apartmentId: '$_id', count: 1 } },
    ]);
    return result as { apartmentId: string; count: number }[];
  }
}

