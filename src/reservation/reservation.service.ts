import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { CreateReservationDto } from './dto/reservation.dto';
import { CheckAvailabilityDto } from './dto/check-availability.dto';
import { SearchReservationsDto } from './dto/search-reservations.dto';
import { Reservation } from './reservation.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PynbookingService } from '../pynbooking/pynbooking.service';
import {
  CheckAvailabilityResponse,
  PynbookingConfirmPaidResponse,
  PynBookingReservation,
} from '../pynbooking/types';

@Injectable()
export class ReservationService {
  constructor(
    @InjectModel(Reservation.name) private reservationModel: Model<Reservation>,
    private readonly pynbookingService: PynbookingService,
  ) {}

  async create(
    reservationDto: CreateReservationDto,
    apartmentId?: string,
  ): Promise<PynbookingConfirmPaidResponse | null> {

    const existing = await this.reservationModel.findOne({ 
      paymentIntentId: reservationDto.paymentIntentId 
    });
    
    if (existing) {
      throw new InternalServerErrorException('Reservation already exists');
    }

    try {
      const reservationData: any = {
        hotelId: reservationDto.hotelId,
        guestName: reservationDto.guestName,
        guestEmail: reservationDto.guestEmail,
        guestPhone: reservationDto.guestPhone,
        checkInDate: new Date(reservationDto.checkInDate),
        checkOutDate: new Date(reservationDto.checkOutDate),
        totalPrice: reservationDto.totalPrice,
        paymentIntentId: reservationDto.paymentIntentId,
        rooms: reservationDto.rooms,
        currency: reservationDto.rooms?.[0]?.currency || 'RON',
        status: 'confirmed',
      };

      if (apartmentId) {
        reservationData.apartment = apartmentId;
      }

      await this.reservationModel.create(reservationData);
    } catch (dbError: any) {
      throw new InternalServerErrorException(
        `Failed to save reservation to DB: ${dbError?.message}`,
      );
    }

    let pynbookingResponse: PynbookingConfirmPaidResponse | null = null;
    try {
      pynbookingResponse = await this.pynbookingService.sendReservation(reservationDto);
    } catch (error: any) {
    }
    
    return pynbookingResponse;
  }

  async findByPaymentIntentId(paymentIntentId: string) {
    return this.reservationModel.findOne({ paymentIntentId });
  }

  async checkAvailability(
    params: CheckAvailabilityDto,
  ): Promise<CheckAvailabilityResponse> {
    return this.pynbookingService.checkAvailability({
      hotelId: params.hotelId,
      roomId: params.roomId,
      checkInDate: params.checkInDate,
      checkOutDate: params.checkOutDate,
      currency: (params.currency || 'RON').toUpperCase(),
    });
  }

  async searchReservations(
    params: SearchReservationsDto,
  ): Promise<PynBookingReservation[]> {
    return this.pynbookingService.searchReservations({
      date: params.date,
      days: params.days,
      roomNo: params.roomNo,
    });
  }
}

