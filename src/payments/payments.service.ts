import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { Stripe } from 'stripe';

@Injectable()
export class PaymentsService {
  constructor(@Inject('STRIPE_CLIENT') private readonly stripe: Stripe) {}

  async createPaymentIntent({
    amount,
    metadata,
  }: {
    amount: number;
    metadata: Record<string, string>;
  }) {
    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount * 100),
        currency: 'ron',
        automatic_payment_methods: { enabled: true },
        metadata,
      });

      return {
        clientSecret: paymentIntent.client_secret,
      };
    } catch (error) {
      throw new BadRequestException(
        `Error creating payment intent: ${error.message}`,
      );
    }
  }
}
