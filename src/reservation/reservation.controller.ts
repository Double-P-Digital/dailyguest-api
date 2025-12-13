import {Body,Controller,Get,Post,Param,Query,UseGuards,ValidationPipe,} from '@nestjs/common';
import { CreateReservationDto as ReservationDto } from './dto/reservation.dto';
import { CheckAvailabilityDto } from './dto/check-availability.dto';
import { SearchReservationsDto } from './dto/search-reservations.dto';
import { ReservationService } from './reservation.service';
import { ApiKeyGuard } from '../security/guard';
import {CheckAvailabilityResponse,PynbookingConfirmPaidResponse,PynBookingReservation,} from '../pynbooking/types';
import { Reservation } from './reservation.schema';

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

  // ==================== Failed Reservations Endpoints ====================

  /**
   * Get all reservations that failed to sync with PynBooking
   */
  @Get('failed')
  async getFailedReservations(): Promise<Reservation[]> {
    return this.reservationService.getFailedReservations();
  }

  /**
   * Retry syncing a failed reservation with PynBooking
   */
  @Post(':id/retry-sync')
  async retrySync(
    @Param('id') id: string,
  ): Promise<{ success: boolean; message: string }> {
    return this.reservationService.retrySync(id);
  }

  /**
   * Mark a failed reservation as manually resolved
   */
  @Post(':id/mark-resolved')
  async markAsResolved(
    @Param('id') id: string,
    @Body() body: { notes?: string },
  ): Promise<{ success: boolean; message: string }> {
    return this.reservationService.markAsResolved(id, body.notes);
  }
}
