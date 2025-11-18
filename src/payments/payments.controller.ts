import {
  Controller,
  Post,
  Body,
  ValidationPipe,
  BadRequestException,
  Req,
  Headers,
  Inject,
  Logger,
  UseGuards,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { ConfigService } from '@nestjs/config';
import { Stripe } from 'stripe';
import { ReservationService } from '../reservation/reservation.service';
import { CreateReservationDto } from '../reservation/dto/reservation.dto';
import { ApiKeyGuard } from '../security/guard';

@UseGuards(ApiKeyGuard)
@Controller('/api/payments')
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);
  private readonly webhookSecret: string;
  private readonly PLATFORM_FEE_PERCENTAGE = 0.2;

  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly configService: ConfigService,
    private readonly reservationService: ReservationService,
    @Inject('STRIPE_CLIENT') private readonly stripe: Stripe,
  ) {
    this.webhookSecret = this.configService.getOrThrow<string>(
      'STRIPE_WEBHOOK_SECRET',
    );
  }

  @Post('create-intent')
  async createPaymentIntent(
    @Body(new ValidationPipe()) dto: CreatePaymentIntentDto,
  ) {
    return this.paymentsService.createPaymentIntent({
      amount: dto.amount,
      metadata: dto.metadata,
    });
  }

  @Post('webhook')
  async handleStripeWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() req: RawBodyRequest<Request>,
  ) {
    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(
        req.rawBody!,
        signature,
        this.webhookSecret,
      );
    } catch (err) {
      throw new BadRequestException(`Webhook Error: ${err.message}`);
    }

    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        this.logger.log(`PaymentIntent ${paymentIntent.id} succeeded!`);

        const metadata = paymentIntent.metadata;

        const reservationDto: CreateReservationDto = {
          apartment: metadata.apartment,
          guestName: metadata.guestName,
          guestEmail: metadata.guestEmail,
          checkInDate: new Date(metadata.checkInDate),
          checkOutDate: new Date(metadata.checkOutDate),
          guestsCount: Number(metadata.guestsCount) || 1,
          totalPrice: Number(metadata.totalPrice),
          paymentIntentId: paymentIntent.id,
          status: 'confirmed',
        };

        const existingReservation =
          await this.reservationService.findByPaymentIntentId(paymentIntent.id);
        if (existingReservation) {
          this.logger.log(
            `Reservation already exists for PaymentIntent ${paymentIntent.id}`,
          );
          break;
        }

        await this.reservationService.create(reservationDto);
        break;

      case 'payment_intent.payment_failed': {
        const failedIntent = event.data.object as Stripe.PaymentIntent;
        this.logger.log(`PaymentIntent ${failedIntent.id} failed.`);
        break;
      }

      default:
        this.logger.log(`Unhandled event type ${event.type}`);
    }

    return { received: true };
  }
}
