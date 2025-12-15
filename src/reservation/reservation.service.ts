import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
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
import { RoomLockService } from '../room-lock/room-lock.service';

@Injectable()
export class ReservationService {
  private readonly logger = new Logger(ReservationService.name);

  constructor(
    @InjectModel(Reservation.name) private reservationModel: Model<Reservation>,
    private readonly pynbookingService: PynbookingService,
    private readonly roomLockService: RoomLockService,
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

    let savedReservation;
    try {
      const reservationData: any = {
        hotelId: reservationDto.hotelId,
        guestName: reservationDto.guestName,
        guestEmail: reservationDto.guestEmail,
        guestPhone: reservationDto.guestPhone,
        guestAddress: reservationDto.guestAddress,
        checkInDate: new Date(reservationDto.checkInDate),
        checkOutDate: new Date(reservationDto.checkOutDate),
        totalPrice: reservationDto.totalPrice,
        paymentIntentId: reservationDto.paymentIntentId,
        rooms: reservationDto.rooms,
        currency: reservationDto.rooms?.[0]?.currency || 'RON',
        status: 'confirmed',
        syncFailed: false,
        syncError: null,
      };

      if (apartmentId) {
        reservationData.apartment = apartmentId;
      }

      savedReservation = await this.reservationModel.create(reservationData);
    } catch (dbError: any) {
      throw new InternalServerErrorException(
        `Failed to save reservation to DB: ${dbError?.message}`,
      );
    }

    // Try to sync with PynBooking
    let pynbookingResponse: PynbookingConfirmPaidResponse | null = null;
    try {
      pynbookingResponse = await this.pynbookingService.sendReservation(reservationDto);
      
      // Update reservation with PynBooking response if available
      if (pynbookingResponse) {
        await this.reservationModel.findByIdAndUpdate(savedReservation._id, {
          pynbookingId: pynbookingResponse.bookingId?.toString(),
          syncFailed: false,
          syncError: null,
        });
      }
    } catch (error: any) {
      this.logger.error(`PynBooking sync failed for reservation ${savedReservation._id}: ${error.message}`);
      
      // Mark reservation as sync failed
      await this.reservationModel.findByIdAndUpdate(savedReservation._id, {
        syncFailed: true,
        syncError: error.message || 'Unknown PynBooking sync error',
        syncFailedAt: new Date(),
      });
    }
    
    return pynbookingResponse;
  }

  async findByPaymentIntentId(paymentIntentId: string) {
    return this.reservationModel.findOne({ paymentIntentId });
  }

  async checkAvailability(
    params: CheckAvailabilityDto,
  ): Promise<CheckAvailabilityResponse> {
    const roomType = params.roomType ?? (params.roomId ? params.roomId.toString() : '');

    if (!roomType) {
      return {
        available: true,
        message: 'Nu s-a putut verifica disponibilitatea (roomType lipsă)',
      };
    }

    // Step 1: Check for active locks in our system
    const hasLock = await this.roomLockService.hasActiveLock(
      roomType,
      params.checkInDate,
      params.checkOutDate,
    );

    if (hasLock) {
      return {
        available: false,
        message: 'Camera este în curs de rezervare de alt utilizator',
      };
    }

    // Step 2: Check PynBooking for existing reservations
    return this.pynbookingService.checkAvailability({
      hotelId: params.hotelId ?? 0,
      roomType,
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

  // ==================== Failed Reservations Management ====================

  /**
   * Get all reservations that failed to sync with PynBooking
   */
  async getFailedReservations(): Promise<Reservation[]> {
    return this.reservationModel.find({
      syncFailed: true,
    }).sort({ syncFailedAt: -1 }).exec();
  }

  /**
   * Retry syncing a failed reservation with PynBooking
   */
  async retrySync(reservationId: string): Promise<{ success: boolean; message: string }> {
    const reservation = await this.reservationModel.findById(reservationId);
    
    if (!reservation) {
      return { success: false, message: 'Rezervarea nu a fost găsită' };
    }

    if (!reservation.syncFailed) {
      return { success: false, message: 'Rezervarea este deja sincronizată' };
    }

    try {
      const reservationDto: CreateReservationDto = {
        hotelId: reservation.hotelId,
        guestName: reservation.guestName,
        guestEmail: reservation.guestEmail,
        guestPhone: reservation.guestPhone,
        guestAddress: reservation.guestAddress || 'N/A',
        checkInDate: reservation.checkInDate.toISOString().split('T')[0],
        checkOutDate: reservation.checkOutDate.toISOString().split('T')[0],
        totalPrice: reservation.totalPrice,
        paymentIntentId: reservation.paymentIntentId,
        rooms: reservation.rooms,
      };

      const pynbookingResponse = await this.pynbookingService.sendReservation(reservationDto);
      
      // Update reservation as synced
      await this.reservationModel.findByIdAndUpdate(reservationId, {
        pynbookingId: pynbookingResponse?.bookingId?.toString(),
        syncFailed: false,
        syncError: null,
        syncRetriedAt: new Date(),
      });

      this.logger.log(`Retry sync successful for reservation: ${reservationId}`);
      return { success: true, message: 'Sincronizare reușită' };
    } catch (error: any) {
      this.logger.error(`Retry sync failed for reservation: ${reservationId}`, error.message);
      
      // Update sync error
      await this.reservationModel.findByIdAndUpdate(reservationId, {
        syncError: error.message || 'Unknown error',
        syncRetriedAt: new Date(),
      });

      return { success: false, message: error.message || 'Sincronizare eșuată' };
    }
  }

  /**
   * Mark a failed reservation as manually resolved
   */
  async markAsResolved(reservationId: string, notes?: string): Promise<{ success: boolean; message: string }> {
    const reservation = await this.reservationModel.findById(reservationId);
    
    if (!reservation) {
      return { success: false, message: 'Rezervarea nu a fost găsită' };
    }

    await this.reservationModel.findByIdAndUpdate(reservationId, {
      syncFailed: false,
      syncError: null,
      manuallyResolved: true,
      resolvedAt: new Date(),
      resolvedNotes: notes || 'Marcat manual ca rezolvat',
    });

    this.logger.log(`Reservation marked as resolved: ${reservationId}`);
    return { success: true, message: 'Rezervarea a fost marcată ca rezolvată' };
  }
}

