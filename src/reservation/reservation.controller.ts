import {Body,Controller,Get,Post,Query,UseGuards,ValidationPipe,} from '@nestjs/common';
import { CreateReservationDto as ReservationDto } from './dto/reservation.dto';
import { CheckAvailabilityDto } from './dto/check-availability.dto';
import { SearchReservationsDto } from './dto/search-reservations.dto';
import { ReservationService } from './reservation.service';
import { ApiKeyGuard } from '../security/guard';
import {CheckAvailabilityResponse,PynbookingConfirmPaidResponse,PynBookingReservation,} from '../pynbooking/types';

@UseGuards(ApiKeyGuard)
@Controller('/api/reservation-service')
export class ReservationController {
  constructor(private readonly reservationService: ReservationService) {}

  @Post()
  create(
    @Body() reservation: ReservationDto,
  ): Promise<PynbookingConfirmPaidResponse | null> {
    return this.reservationService.create(reservation);
  }

  @Get('check-availability')
  async checkAvailability(
    @Query(new ValidationPipe({ transform: true })) query: CheckAvailabilityDto,
  ): Promise<CheckAvailabilityResponse> {
    return this.reservationService.checkAvailability(query);
  }

  @Post('search-reservations')
  async searchReservations(
    @Body(new ValidationPipe()) body: SearchReservationsDto,
  ): Promise<PynBookingReservation[]> {
    return this.reservationService.searchReservations(body);
  }
}
