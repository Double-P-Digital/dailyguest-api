import { IsNumber, IsPositive, IsString, IsNotEmpty } from 'class-validator';

export class CreateSplitPaymentIntentDto {
  @IsNumber()
  @IsPositive()
  totalAmount: number;

  @IsString()
  @IsNotEmpty()
  ownerStripeAccountId: string;
}
