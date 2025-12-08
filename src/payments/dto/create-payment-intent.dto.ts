import {
  IsString,
  IsEmail,
  IsNotEmpty,
  IsDateString,
  IsNumber,
  IsMongoId,
  Min,
  IsOptional,
  IsIn,
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

  @IsString()
  @IsOptional()
  @IsIn(['eur', 'ron', 'EUR', 'RON'])
  @Transform(({ value }) => value?.toLowerCase())
  currency?: string;

  @IsString()
  @IsOptional()
  guestPhone?: string;

  @IsString()
  @IsOptional()
  hotelId?: string;

  @IsString()
  @IsOptional()
  rooms?: string; 

  get metadata(): Record<string, string> {
    return {
      apartment: this.apartment,
      guestName: this.guestName,
      guestEmail: this.guestEmail,
      checkInDate: this.checkInDate,
      checkOutDate: this.checkOutDate,
      guestsCount: this.guestsCount.toString(),
      totalPrice: this.amount.toString(),
      guestPhone: this.guestPhone || '',
      hotelId: this.hotelId || '',
      rooms: this.rooms || '[]',
      currency: (this.currency || 'RON').toUpperCase(),
    };
  }
}
