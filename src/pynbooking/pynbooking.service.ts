import { HttpService } from '@nestjs/axios';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
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
  private readonly logger = new Logger(PynbookingService.name);
  private readonly bookingApiKey: string;
  private readonly searchApiKey: string;
  private readonly baseUrl = 'https://api.pynbooking.direct/booking/add/';
  private readonly searchUrl = 'https://api.pynbooking.com/reservation/search/';

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    this.bookingApiKey =
      this.config.get<string>('PYNBOOKING_BOOK_API_KEY') ||
      this.config.getOrThrow<string>('PYNBOOKING_API_KEY');
    this.searchApiKey =
      this.config.get<string>('PYNBOOKING_SEARCH_API_KEY') ||
      this.config.getOrThrow<string>('PYNBOOKING_API_KEY');
  }

  async sendReservation(
    reservationDto: CreateReservationDto,
  ): Promise<PynbookingConfirmPaidResponse> {
    try {
      const payload: PynbookingCreateReservationDto =
        PynbookingFactory.buildReservationPayload(reservationDto);

      const url = this.baseUrl;

      // Convert payload to URL-encoded format (PynBooking requires x-www-form-urlencoded)
      const formData = new URLSearchParams();
      formData.append('arrivalDate', payload.arrivalDate);
      formData.append('departureDate', payload.departureDate);
      formData.append('guestName', payload.guestName);
      formData.append('guestEmail', payload.guestEmail);
      // Phone should include country code prefix
      const phone = payload.guestPhone.startsWith('+') ? payload.guestPhone : `+40${payload.guestPhone}`;
      formData.append('guestPhone', phone);
      formData.append('guestCountryCode', payload.guestCountryCode);
      formData.append('guestCity', payload.guestCity);
      formData.append('guestAddress', payload.guestAddress);
      formData.append('currency', payload.currency);
      formData.append('language', payload.language);
      formData.append('totalPrice', payload.totalPrice.toString());
      if (payload.hotelId) {
        formData.append('hotelId', payload.hotelId.toString());
      }
      
      // Rooms as JSON string (PynBooking expects this format)
      formData.append('rooms', JSON.stringify(payload.rooms));

      const response = await firstValueFrom(
        this.http.post<PynbookingConfirmPaidResponse>(url, formData.toString(), {
          headers: {
            'Api-Key': this.bookingApiKey,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }),
      );

      return response.data;
    } catch (error: any) {
      this.logger.error(`Reservation failed: ${error?.response?.data?.detail || error?.message}`);

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
              'Api-Key': this.searchApiKey,
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
    hotelId?: number;
    roomType: string;
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
      formData.append('roomNo', params.roomType);

      const response = await firstValueFrom(
        this.http.post<PynBookingReservation[]>(
          this.searchUrl,
          formData.toString(),
          {
            headers: {
              'Api-Key': this.searchApiKey,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          },
        ),
      );

      const reservations: PynBookingReservation[] = response.data;
      const roomName = params.roomType;

      const overlappingReservations = reservations.filter((reservation) => {
        const resCheckIn = new Date(reservation.checkInDate);
        const resCheckOut = new Date(reservation.checkOutDate);

        // Check date overlap
        const datesOverlap = checkIn < resCheckOut && checkOut > resCheckIn;
        
        // Check room match
        const roomTypeMatch = (reservation as any).roomType === roomName;
        const roomNameMatch = reservation.roomName === roomName;
        const roomNameContains = reservation.roomName?.toLowerCase().includes(roomName.toLowerCase());
        const roomNameMatches = roomTypeMatch || roomNameMatch || roomNameContains;
        
        // Check status
        const statusLower = reservation.status?.toLowerCase() || '';
        const isConfirmed = statusLower === 'confirmed' || statusLower === 'confirmata' || statusLower === 'confirmată';

        return datesOverlap && roomNameMatches && isConfirmed;
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
