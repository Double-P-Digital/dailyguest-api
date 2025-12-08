import {Controller,Post,Body,ValidationPipe,BadRequestException,Req,Headers,Inject,UseGuards,} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import { Stripe } from 'stripe';
import { PaymentsService } from './payments.service';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { ReservationService } from '../reservation/reservation.service';
import { CreateReservationDto } from '../reservation/dto/reservation.dto';
import { ApiKeyGuard } from '../security/guard';
import { ApartmentService } from '../apartments/apartment.service';

@Controller('/api/payments')
export class PaymentsController {
  private readonly webhookSecret: string;

  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly reservationService: ReservationService,
    private readonly apartmentService: ApartmentService,
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
    const metadata = {
      ...dto.metadata,
      hotelId: apartment.hotelId || dto.hotelId || '',
    };

    return this.paymentsService.createPaymentIntent({
      amount: dto.amount,
      metadata: metadata,
      currency: dto.currency || 'ron',
      stripeAccountId: apartment.stripeAccountId,
    });
  }

  @Post('webhook')
  async handleStripeWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() req: RawBodyRequest<Request>,
  ) {
    let event: Stripe.Event;

    try {
      if (!signature) {
        throw new BadRequestException('Missing stripe-signature header');
      }

      if (!this.webhookSecret) {
        throw new BadRequestException('Webhook secret not configured');
      }

      event = this.stripe.webhooks.constructEvent(
        req.rawBody!,
        signature,
        this.webhookSecret,
      );
    } catch (err: any) {
      throw new BadRequestException(`Webhook Error: ${err.message}`);
    }

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const metadata = paymentIntent.metadata;
        const apartmentId = metadata.apartment;
        if (!apartmentId) {
          break;
        }

        let apartment;
        try {
          apartment = await this.apartmentService.findOne(apartmentId);
        } catch (error: any) {
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
                planId: 1, 
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
          rooms: rooms,
        };

        const existingReservation =
          await this.reservationService.findByPaymentIntentId(paymentIntent.id);

        if (existingReservation) {
          break;
        }
        
        await this.reservationService.create(reservationDto, apartmentId);

        break;
      }

      case 'payment_intent.payment_failed': {
        break;
      }

      default:
        break;
    }

    return { received: true };
  }
}
