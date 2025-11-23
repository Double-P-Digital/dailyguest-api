import { HttpService } from '@nestjs/axios';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { CreateReservationDto } from '../reservation/dto/reservation.dto';
import { PynbookingFactory } from './pynbooking.utils';
import { PynbookingCreateReservationDto } from './types';

export type PynbookingConfirmPaidResponse = {
  bookingId: number;
  status: string;
  message?: string;
};

@Injectable()
export class PynbookingService {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.pynbooking.direct/booking/add/';

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    this.apiKey = this.config.getOrThrow('PYNBOOKING_API_KEY');
  }

  /**
   * Sends a reservation to Pynbooking after a successful booking.
   * @param reservationDto The DTO from your website reservation
   * @param hotelId Optional: hotel ID for Pynbooking
   * @param confirmUrl Optional: confirmation URL for EU payment flow
   */
  async sendReservation(
    reservationDto: CreateReservationDto,
    hotelId?: number,
    confirmUrl?: string,
  ): Promise<PynbookingConfirmPaidResponse> {
    try {
      const payload: PynbookingCreateReservationDto =
        PynbookingFactory.buildReservationPayload(
          reservationDto,
          hotelId,
          confirmUrl,
        );

      const url = `${this.baseUrl}/booking/confirmPaid/`;
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
      console.error('Pynbooking API error:', error?.response?.data || error);
      throw new InternalServerErrorException(
        'Failed to send reservation to Pynbooking',
      );
    }
  }
}
