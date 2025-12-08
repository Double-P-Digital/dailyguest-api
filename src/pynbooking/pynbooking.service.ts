import { HttpService } from '@nestjs/axios';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { CreateReservationDto } from '../reservation/dto/reservation.dto';
import { PynbookingFactory } from './pynbooking.utils';
import {
  CheckAvailabilityResponse,
  PynbookingConfirmPaidResponse,
  PynbookingCreateReservationDto,
  PynBookingReservation,
} from './types';

@Injectable()
export class PynbookingService {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.pynbooking.direct/booking/add/';
  private readonly searchUrl = 'https://api.pynbooking.com/reservation/search/';

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    this.apiKey = this.config.getOrThrow('PYNBOOKING_API_KEY');
  }

  async sendReservation(
    reservationDto: CreateReservationDto,
  ): Promise<PynbookingConfirmPaidResponse> {
    try {
      const payload: PynbookingCreateReservationDto =
        PynbookingFactory.buildReservationPayload(reservationDto);

      const url = this.baseUrl;

      const response = await firstValueFrom(
        this.http.post<PynbookingConfirmPaidResponse>(url, payload, {
          headers: {
            'Api-Key': this.apiKey,
            'Content-Type': 'application/json',
          },
        }),
      );

      return response.data;
    } catch (error: any) {

      const errorMessage = error?.response?.data?.message || 
                          error?.response?.data?.detail ||
                          error?.response?.data?.title ||
                          error?.message ||
                          'Failed to send reservation to Pynbooking';

      throw new InternalServerErrorException(
        `PynBooking Error: ${errorMessage} (Status: ${error?.response?.status || 'N/A'})`,
      );
    }
  }

  async searchReservations(params: {
    date: string;
    days?: number;
    roomNo?: string;
  }): Promise<PynBookingReservation[]> {
    try {
      const formData = new URLSearchParams();
      formData.append('date', params.date);

      if (params.days !== undefined) {
        formData.append('days', params.days.toString());
      }

      if (params.roomNo !== undefined) {
        formData.append('roomNo', params.roomNo.toString());
      }

      const response = await firstValueFrom(
        this.http.post<PynBookingReservation[]>(
          this.searchUrl,
          formData.toString(),
          {
            headers: {
              'Api-Key': this.apiKey,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          },
        ),
      );

      return response.data;
    } catch (error: any) {

      const errorMessage =
        error?.response?.data?.message ||
        error?.response?.data?.detail ||
        error?.response?.data?.title ||
        error?.message ||
        'Eroare la căutarea rezervărilor';
      throw new BadRequestException(
        `PynBooking Error: ${errorMessage} (Status: ${error?.response?.status || 'N/A'})`,
      );
    }
  }

  async checkAvailability(params: {
    hotelId: number;
    roomId: number;
    checkInDate: string;
    checkOutDate: string;
    currency: string;
  }): Promise<CheckAvailabilityResponse> {
    try {
      const checkIn = new Date(params.checkInDate);
      const checkOut = new Date(params.checkOutDate);

      if (checkIn >= checkOut) {
        throw new BadRequestException(
          'Data de check-in trebuie să fie înainte de data de check-out',
        );
      }

      const daysDiff = Math.ceil(
        (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24),
      );
      const days = Math.min(daysDiff, 31);

      if (days <= 0) {
        throw new BadRequestException('Perioada selectată nu este validă');
      }

      const formData = new URLSearchParams();
      formData.append('date', params.checkInDate);
      formData.append('days', days.toString());
      formData.append('roomNo', params.roomId.toString());

      const response = await firstValueFrom(
        this.http.post<PynBookingReservation[]>(
          this.searchUrl,
          formData.toString(),
          {
            headers: {
              'Api-Key': this.apiKey,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          },
        ),
      );

      const reservations: PynBookingReservation[] = response.data;

      const roomName = params.roomId.toString();
      const overlappingReservations = reservations.filter((reservation) => {
        const resCheckIn = new Date(reservation.checkInDate);
        const resCheckOut = new Date(reservation.checkOutDate);

        return (
          checkIn < resCheckOut &&
          checkOut > resCheckIn &&
          reservation.roomName === roomName &&
          reservation.status === 'Confirmed'
        );
      });

      const hasOverlap = overlappingReservations.length > 0;

      return {
        available: !hasOverlap,
        message: hasOverlap
          ? 'Camera nu este disponibilă pentru datele selectate'
          : 'Camera este disponibilă pentru datele selectate',
      };
    } catch (error: any) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      const errorMessage =
        error?.response?.data?.message ||
        error?.response?.data?.detail ||
        error?.response?.data?.title ||
        error?.message ||
        'Eroare la verificarea disponibilității';
      throw new BadRequestException(
        `PynBooking Error: ${errorMessage} (Status: ${error?.response?.status || 'N/A'})`,
      );
    }
  }
}
