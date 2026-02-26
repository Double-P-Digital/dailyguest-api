import { BadRequestException, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { CreateReservationDto } from './dto/reservation.dto';
import { CheckAvailabilityDto } from './dto/check-availability.dto';
import { SearchReservationsDto } from './dto/search-reservations.dto';
import { Reservation } from './reservation.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { PynbookingService } from '../pynbooking/pynbooking.service';
import {
  CheckAvailabilityResponse,
  PynbookingConfirmPaidResponse,
  PynBookingReservation,
} from '../pynbooking/types';
import { RoomLockService } from '../room-lock/room-lock.service';
import { BlockedDate } from '../apartments/blocked-date.schema';
import { Apartment } from '../apartments/apartment.schema';
import { PriceOverride, PriceOverrideDocument } from '../apartments/price-override.schema';
import { DiscountCode, DiscountType } from '../discountCodes/discountCode.schema';

@Injectable()
export class ReservationService {
  private readonly logger = new Logger(ReservationService.name);

  constructor(
    @InjectModel(Reservation.name) private reservationModel: Model<Reservation>,
    @InjectModel(BlockedDate.name) private blockedDateModel: Model<BlockedDate>,
    @InjectModel(Apartment.name) private apartmentModel: Model<Apartment>,
    @InjectModel(PriceOverride.name) private priceOverrideModel: Model<PriceOverrideDocument>,
    @InjectModel(DiscountCode.name) private discountCodeModel: Model<DiscountCode>,
    private readonly pynbookingService: PynbookingService,
    private readonly roomLockService: RoomLockService,
  ) {}

  async create(
    reservationDto: CreateReservationDto,
    apartmentId?: string,
    promoCode?: string,
  ): Promise<PynbookingConfirmPaidResponse | null> {
    const existing = await this.reservationModel.findOne({ 
      paymentIntentId: reservationDto.paymentIntentId 
    });
    
    if (existing) {
      throw new InternalServerErrorException('Reservation already exists');
    }

    // === GUARD: Re-verificare blocked dates la momentul creării rezervării ===
    const checkIn = new Date(reservationDto.checkInDate);
    const checkOut = new Date(reservationDto.checkOutDate);
    const roomType = reservationDto.rooms?.[0]?.roomId?.toString() || '';
    
    if (roomType) {
      const apartment = await this.apartmentModel.findOne({
        $or: [
          { roomType: roomType },
          { roomId: roomType },
          { name: roomType },
        ],
      }).exec();

      if (apartment) {
        // Verificare blocked dates
        const blockedDates = await this.blockedDateModel.find({
          apartmentId: apartment._id,
          isActive: true,
          startDate: { $lte: checkOut },
          endDate: { $gte: checkIn },
        }).exec();

        if (blockedDates.length > 0) {
          this.logger.warn(`[ReservationGuard] BLOCKED: Reservation attempt for ${apartment.name} blocked by admin dates`);
          throw new BadRequestException(
            'Perioada selectată a fost blocată de admin între timp. Vă rugăm să selectați alte date.',
          );
        }

        // Re-calculare preț curent (cu overrides) și verificare cu discount code
        const nightlyPrices: number[] = [];
        const currentDate = new Date(checkIn);
        while (currentDate < checkOut) {
          const override = await this.priceOverrideModel.findOne({
            apartmentId: apartment._id,
            isActive: true,
            startDate: { $lte: currentDate },
            endDate: { $gte: currentDate },
          }).sort({ createdAt: -1 }).exec();

          nightlyPrices.push(override ? override.price : (apartment.price || 0));
          currentDate.setDate(currentDate.getDate() + 1);
        }

        let currentTotalPrice = nightlyPrices.reduce((sum, p) => sum + p, 0);
        const submittedPrice = reservationDto.totalPrice;
        
        // Dacă avem promo code, recalculăm prețul așteptat cu discount-ul aplicat
        if (promoCode && currentTotalPrice > 0) {
          try {
            const discountCode = await this.discountCodeModel.findOne({ 
              code: promoCode.toUpperCase() 
            }).exec();
            
            if (discountCode) {
              const now = new Date();
              const isValid = new Date(discountCode.expirationDate) >= now;
              const isApplicable = !discountCode.apartmentIds?.length || 
                discountCode.apartmentIds.some(id => id.toString() === apartment._id.toString());
              
              if (isValid && isApplicable) {
                if (discountCode.discountType === DiscountType.FIXED) {
                  // FIXED: valoarea e prețul pe noapte
                  currentTotalPrice = discountCode.value * nightlyPrices.length;
                } else {
                  // PERCENTAGE: reduce totalul cu procentul
                  const discountAmount = (currentTotalPrice * discountCode.value) / 100;
                  currentTotalPrice = Math.max(0, currentTotalPrice - discountAmount);
                }
                currentTotalPrice = Math.round(currentTotalPrice * 100) / 100;
                this.logger.log(
                  `[ReservationGuard] Promo code "${promoCode}" valid for ${apartment.name} - adjusted price: ${currentTotalPrice}`,
                );
              } else {
                this.logger.warn(
                  `[ReservationGuard] Promo code "${promoCode}" invalid/expired for ${apartment.name}`,
                );
              }
            } else {
              this.logger.warn(
                `[ReservationGuard] Promo code "${promoCode}" not found in DB`,
              );
            }
          } catch (err: any) {
            this.logger.warn(`[ReservationGuard] Error validating promo code: ${err.message}`);
          }
        }
        
        // Toleranță de 1% pentru diferențe de rotunjire
        const priceDiff = Math.abs(currentTotalPrice - submittedPrice);
        const tolerance = currentTotalPrice * 0.01;
        
        if (priceDiff > tolerance && currentTotalPrice > 0) {
          this.logger.warn(
            `[ReservationGuard] PRICE MISMATCH: ${apartment.name} - submitted: ${submittedPrice}, expected: ${currentTotalPrice}${promoCode ? ` (promo: ${promoCode})` : ''}`,
          );
          throw new BadRequestException(
            `Prețul s-a modificat între timp. Prețul actual este ${currentTotalPrice} ${apartment.currency || 'RON'}. Vă rugăm să reîncărcați pagina.`,
          );
        }
      }
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

    // Step 1: Check for blocked dates (permanent blocks set by admin)
    const checkInDate = new Date(params.checkInDate);
    const checkOutDate = new Date(params.checkOutDate);
    
    // Căutăm apartamentul după roomType, roomId sau name
    const apartment = await this.apartmentModel.findOne({
      $or: [
        { roomType: roomType },
        { roomId: roomType },
        { name: roomType },
      ],
    }).exec();
    this.logger.log(`[BlockedDates] roomType="${roomType}" → apartment: ${apartment ? apartment.name + ' (id: ' + apartment._id + ')' : 'NOT FOUND'}`);
    
    if (apartment) {
      const blockedDates = await this.blockedDateModel.find({
        apartmentId: apartment._id,
        isActive: true,
        startDate: { $lte: checkOutDate },
        endDate: { $gte: checkInDate },
      }).exec();

      if (blockedDates.length > 0) {
        this.logger.log(`[BlockedDates] BLOCKED: ${blockedDates.length} blocked period(s) found for ${apartment.name}`);
        return {
          available: false,
          message: 'Perioada selectată nu este disponibilă (date blocate de admin)',
        };
      }
    }

    // Step 2: Check for active locks in our system (temporary payment locks)
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

    // Step 3: Check PynBooking for existing reservations
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

