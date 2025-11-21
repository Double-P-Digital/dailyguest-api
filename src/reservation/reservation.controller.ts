import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { CreateReservationDto as ReservationDto } from './dto/reservation.dto';
import { ReservationService } from './reservation.service';
import { Reservation } from './reservation.schema';
import { ApiKeyGuard } from '../security/guard';

@UseGuards(ApiKeyGuard)
@Controller('/api/reservation-service')
export class ReservationController {
  constructor(private readonly reservationService: ReservationService) {}

  @Post()
  create(@Body() reservation: ReservationDto): Promise<Reservation> {
    return this.reservationService.create(reservation);
  }
}
