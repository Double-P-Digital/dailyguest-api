import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

export type PynbookingConfirmPaidResponse = {
  bookingId: number;
  status: string;
  message?: string;
};

@Injectable()
export class PynbookingService {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.pynbooking.direct';

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    this.apiKey = this.config.getOrThrow('PYNBOOKING_API_KEY');
  }

  async confirmPaidBooking(
    payload: any,
  ): Promise<PynbookingConfirmPaidResponse> {
    const url = `${this.baseUrl}/booking/confirmPaid/`;
    const response = await firstValueFrom(
      this.http.post<PynbookingConfirmPaidResponse>(url, payload, {
        headers: {
          'Api-Key': this.apiKey,
          'Content-Type': 'application/json',
        },
      }),
    );

    return response.data as PynbookingConfirmPaidResponse;
  }
}
