import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { CreateReservationDto as ReservationDto } from './dto/reservation.dto';
import { ReservationService } from './reservation.service';
import { ApiKeyGuard } from '../security/guard';
import { PynbookingConfirmPaidResponse } from '../pynbooking/types';

@UseGuards(ApiKeyGuard)
@Controller('/api/reservation-service')
export class ReservationController {
  constructor(private readonly reservationService: ReservationService) {}

  @Post()
  create(
    @Body() reservation: ReservationDto,
  ): Promise<PynbookingConfirmPaidResponse> {
    return this.reservationService.create(reservation);
  }
}
