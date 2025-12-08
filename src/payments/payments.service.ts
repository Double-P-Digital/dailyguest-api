import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { Stripe } from 'stripe';

export interface CreatePaymentIntentParams {
  amount: number;
  metadata: Record<string, string>;
  currency: string;
  stripeAccountId: string;
}

@Injectable()
export class PaymentsService {
  constructor(
    @Inject('STRIPE_CLIENT') private readonly stripe: Stripe,
  ) {}

  async createPaymentIntent({
    amount,
    metadata,
    currency,
    stripeAccountId,
  }: {
    amount: number;
    metadata: Record<string, string>;
    currency: string;
    stripeAccountId: string;
  }) {
    try {
      const normalizedCurrency = currency?.toLowerCase();
      const validCurrency = normalizedCurrency === 'eur' ? 'eur' : 'ron';

      if (normalizedCurrency && !['eur', 'ron'].includes(normalizedCurrency)) {
        throw new BadRequestException('Currency must be either "eur" or "ron"');
      }

      let estimatedStripeFee: number;
      if (validCurrency === 'eur') {
        estimatedStripeFee = amount * 0.02 + 0.30;
      } else {
        estimatedStripeFee = amount * 0.035 + 1.00;
      }

      const estimatedNetAmount = amount - estimatedStripeFee;
      const platformFeePercentage = 0.07;
      const applicationFeeAmount = Math.round(
        estimatedNetAmount * platformFeePercentage * 100,
      );

      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount * 100),
        currency: validCurrency,
        automatic_payment_methods: { enabled: true },
        application_fee_amount: applicationFeeAmount,
        transfer_data: {
          destination: stripeAccountId,
        },
        metadata: metadata,
      });

      return {
        clientSecret: paymentIntent.client_secret,
      };
    } catch (error: any) {
      const errorMessage = error.message || '';

      if (errorMessage.includes('No such destination')) {
        throw new BadRequestException(
          `Invalid Stripe Connect Account ID: "${stripeAccountId}". The account does not exist or was deleted. Please update with a valid Stripe account.`,
        );
      }

      if (errorMessage.includes('stripe_balance.stripe_transfers')) {
        throw new BadRequestException(
          `Stripe Connect Account "${stripeAccountId}" does not have required capabilities. Enable "Transfers" inside Stripe Dashboard → Connect → Accounts.`,
        );
      }

      if (errorMessage.includes('account_invalid')) {
        throw new BadRequestException(
          `Stripe Connect Account "${stripeAccountId}" is invalid or not activated.`,
        );
      }

      throw new BadRequestException(
        `Error creating payment intent: ${errorMessage}`,
      );
    }
  }
}
