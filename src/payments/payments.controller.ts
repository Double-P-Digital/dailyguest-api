import {Controller,Post,Body,ValidationPipe,BadRequestException,Req,Headers,Inject,UseGuards,ConflictException,Logger,} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import { Stripe } from 'stripe';
import { PaymentsService } from './payments.service';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { ReservationService } from '../reservation/reservation.service';
import { CreateReservationDto } from '../reservation/dto/reservation.dto';
import { ApiKeyGuard } from '../security/guard';
import { ApartmentService } from '../apartments/apartment.service';
import { RoomLockService } from '../room-lock/room-lock.service';

@Controller('/api/payments')
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);
  private readonly webhookSecret: string;

  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly reservationService: ReservationService,
    private readonly apartmentService: ApartmentService,
    private readonly roomLockService: RoomLockService,
    @Inject('STRIPE_CLIENT') private readonly stripe: Stripe,
  ) {
    this.webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
  }

  @UseGuards(ApiKeyGuard)
  @Post('create-intent')
  async createPaymentIntent(
    @Body(new ValidationPipe()) dto: CreatePaymentIntentDto,
  ) {
    const apartment = await this.apartmentService.findOne(dto.apartment);
    
    const roomType = (apartment as any).roomType || apartment.roomId?.toString() || '';
    const checkInDate = dto.checkInDate;
    const checkOutDate = dto.checkOutDate;

    if (!roomType) {
      throw new BadRequestException('Apartamentul nu are roomType configurat');
    }

    // Step 1: Check if there's already an active lock
    const existingLock = await this.roomLockService.findActiveLock(
      roomType,
      checkInDate,
      checkOutDate,
    );

    if (existingLock) {
      throw new ConflictException(
        'Camera este în curs de rezervare de alt utilizator. Vă rugăm să încercați în câteva minute.',
      );
    }

    // Step 2: Verify availability with PynBooking
    try {
      const availabilityResult = await this.reservationService.checkAvailability({
        roomType,
        checkInDate,
        checkOutDate,
        currency: dto.currency || 'RON',
      });

      if (!availabilityResult.available) {
        throw new BadRequestException(
          availabilityResult.message || 'Camera nu este disponibilă pentru datele selectate',
        );
      }
    } catch (error: any) {
      if (error instanceof BadRequestException || error instanceof ConflictException) {
        throw error;
      }
      // Availability check might fail due to network - continue with caution
      this.logger.warn(`Availability check failed: ${error.message}`);
    }

    // Step 3: Create PaymentIntent first to get the ID
    const metadata = {
      ...dto.metadata,
      hotelId: apartment.hotelId || dto.hotelId || '',
      roomType,
    };

    const paymentIntentResult = await this.paymentsService.createPaymentIntent({
      amount: dto.amount,
      metadata: metadata,
      currency: dto.currency || 'ron',
      stripeAccountId: apartment.stripeAccountId,
    });

    // Step 4: Create the lock with PaymentIntent ID
    try {
      await this.roomLockService.createLock({
        roomType,
        checkInDate,
        checkOutDate,
        paymentIntentId: paymentIntentResult.paymentIntentId,
        apartmentId: dto.apartment,
        guestName: dto.guestName,
        guestEmail: dto.guestEmail,
        guestPhone: dto.guestPhone,
        ttlMinutes: 15,
      });
    } catch (lockError: any) {
      this.logger.error(`Failed to create lock: ${lockError.message}`);
      
      try {
        await this.stripe.paymentIntents.cancel(paymentIntentResult.paymentIntentId);
      } catch (cancelError) {
        // Ignore cancel errors
      }

      throw new ConflictException(
        'Camera este în curs de rezervare de alt utilizator. Vă rugăm să încercați în câteva minute.',
      );
    }

    return paymentIntentResult;
  }

  @Post('webhook')
  async handleStripeWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() req: RawBodyRequest<Request>,
  ) {
    this.logger.log(`[Webhook] Received request`);
    this.logger.log(`[Webhook] Signature present: ${!!signature}`);
    this.logger.log(`[Webhook] RawBody present: ${!!req.rawBody}`);
    this.logger.log(`[Webhook] RawBody length: ${req.rawBody?.length || 0}`);
    this.logger.log(`[Webhook] Webhook secret configured: ${!!this.webhookSecret}`);
    
    let event: Stripe.Event;

    try {
      if (!signature) {
        throw new BadRequestException('Missing stripe-signature header');
      }

      if (!this.webhookSecret) {
        throw new BadRequestException('Webhook secret not configured');
      }

      this.logger.log(`[Webhook] Attempting to verify signature...`);
      
      event = this.stripe.webhooks.constructEvent(
        req.rawBody!,
        signature,
        this.webhookSecret,
      );
      
      this.logger.log(`[Webhook] Signature verified! Event type: ${event.type}`);
    } catch (err: any) {
      this.logger.error(`[Webhook] Verification failed: ${err.message}`);
      throw new BadRequestException(`Webhook Error: ${err.message}`);
    }

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const metadata = paymentIntent.metadata;
        const apartmentId = metadata.apartment;
        
        if (!apartmentId) {
          await this.roomLockService.deleteLock(paymentIntent.id);
          break;
        }

        let apartment;
        try {
          apartment = await this.apartmentService.findOne(apartmentId);
        } catch (error: any) {
          this.logger.error(`Failed to find apartment: ${error.message}`);
          await this.roomLockService.deleteLock(paymentIntent.id);
          break;
        }

        const checkIn = new Date(metadata.checkInDate);
        const checkOut = new Date(metadata.checkOutDate);
        const daysDiff = Math.ceil(
          (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24),
        );
        const totalPrice = Number(metadata.totalPrice);
        const pricePerDay = Array(daysDiff).fill(totalPrice / daysDiff);
        const currency = metadata.currency || 'RON';
        const rooms = metadata.rooms
          ? JSON.parse(metadata.rooms).map((room: any) => ({
              ...room,
              currency: room.currency || currency,
            }))
          : [
              {
                roomId: Number(apartment.roomId),
                planId: 11, 
                quantity: 1,
                currency: currency,
                price: totalPrice,
                pricePerDay: pricePerDay,
                noGuests: Number(metadata.guestsCount || 1),
              },
            ];

        const reservationDto: CreateReservationDto = {
          hotelId: Number(apartment.hotelId) || Number(metadata.hotelId) || 0,
          guestName: metadata.guestName,
          guestEmail: metadata.guestEmail,
          checkInDate: metadata.checkInDate,
          checkOutDate: metadata.checkOutDate,
          totalPrice: totalPrice,
          paymentIntentId: paymentIntent.id,
          guestPhone: metadata.guestPhone || '0000000000',
          guestAddress: metadata.guestAddress || 'N/A',
          rooms: rooms,
        };

        // Check if reservation already exists
        const existingReservation =
          await this.reservationService.findByPaymentIntentId(paymentIntent.id);

        if (existingReservation) {
          await this.roomLockService.deleteLock(paymentIntent.id);
          break;
        }
        
        // Create reservation
        try {
          await this.reservationService.create(reservationDto, apartmentId);
        } catch (reservationError: any) {
          this.logger.error(`Failed to create reservation: ${reservationError.message}`);
        }

        // Always delete the lock after processing
        await this.roomLockService.deleteLock(paymentIntent.id);

        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await this.roomLockService.deleteLock(paymentIntent.id);
        break;
      }

      case 'payment_intent.canceled': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await this.roomLockService.deleteLock(paymentIntent.id);
        break;
      }

      default:
        break;
    }

    return { received: true };
  }
}
