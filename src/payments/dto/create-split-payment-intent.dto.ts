import { IsNumber, IsPositive, IsString, IsNotEmpty } from 'class-validator';

export class CreateSplitPaymentIntentDto {
  /**
   * The total amount to charge the customer, in the main currency unit (e.g., RON).
   * @example 50.00
   */
  @IsNumber()
  @IsPositive()
  totalAmount: number;

  /**
   * The Stripe Connect Account ID of the "owner" who will receive the payout.
   * @example "acct_..."
   */
  @IsString()
  @IsNotEmpty()
  ownerStripeAccountId: string;
}
