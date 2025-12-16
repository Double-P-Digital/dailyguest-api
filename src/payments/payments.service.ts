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

      // Stripe fee pentru carduri EU: ~1.4% + 0.25€ (~1.25 RON)
      // Folosim o estimare conservatoare: 1.7% + 1.25 RON fix
      const estimatedStripeFee = amount * 0.017 + 1.25;
      
      // Net după ce Stripe își ia fee-ul
      const netAmount = amount - estimatedStripeFee;
      
      // Platforma primește 7% din net (curat, după Stripe fees)
      const platformFeePercentage = 0.07;
      const platformNetShare = netAmount * platformFeePercentage;
      
      // Application fee = ce vrem să primim NET + Stripe fee
      // Astfel: platformNetShare = applicationFee - stripeFee
      // Deci: applicationFee = platformNetShare + stripeFee
      const applicationFeeAmount = Math.round((platformNetShare + estimatedStripeFee) * 100);

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
