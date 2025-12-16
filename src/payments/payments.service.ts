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
      if (normalizedCurrency && normalizedCurrency !== 'ron') {
        throw new BadRequestException('Currency must be "ron"');
      }
      const validCurrency = 'ron';

      // Stripe fee estimat: ~1.8% + 1.25 RON fix (carduri EU)
      const estimatedStripeFee = amount * 0.018 + 1.25;      
      const platformFeePercentage = 0.07;
      const stripeFeeSharePercentage = 0.50; 
      
      // Application fee = 7% din total - 50% din Stripe fee
      const platformGrossShare = amount * platformFeePercentage;
      const platformStripeFeeShare = estimatedStripeFee * stripeFeeSharePercentage;
      // Asigură că application fee nu e negativ (pentru sume mici cu discount mare)
      const applicationFeeAmount = Math.max(0, Math.round((platformGrossShare - platformStripeFeeShare) * 100));

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
        paymentIntentId: paymentIntent.id,
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
