import {
  IsString,
  IsEmail,
  IsNotEmpty,
  IsDateString,
  IsNumber,
  IsMongoId,
  Min,
  IsOptional,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreatePaymentIntentDto {
  @IsMongoId()
  @IsNotEmpty()
  apartment: string;

  @IsString()
  @IsNotEmpty()
  guestName: string;

  @IsEmail()
  @IsNotEmpty()
  guestEmail: string;

  @IsDateString()
  @IsNotEmpty()
  checkInDate: string;

  @IsDateString()
  @IsNotEmpty()
  checkOutDate: string;

  @IsNumber()
  @Min(1)
  @IsOptional()
  @Transform(({ value }) => Number(value))
  guestsCount: number = 1;

  @IsNumber()
  @IsNotEmpty()
  @Transform(({ value }) => Number(value))
  amount: number;

  get metadata(): Record<string, string> {
    return {
      apartment: this.apartment,
      guestName: this.guestName,
      guestEmail: this.guestEmail,
      checkInDate: this.checkInDate,
      checkOutDate: this.checkOutDate,
      guestsCount: this.guestsCount.toString(),
      totalPrice: this.amount.toString(),
    };
  }
}
