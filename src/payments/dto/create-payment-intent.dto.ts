import {
  IsString,
  IsEmail,
  IsNotEmpty,
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

  @IsString()
  @IsNotEmpty()
  checkInDate: string;

  @IsString()
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
  @IsIn(['ron', 'RON'])
  @Transform(({ value }) => 'ron')
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

  @IsString()
  @IsOptional()
  guestAddress?: string;

  @IsString()
  @IsOptional()
  promoCode?: string;

  get metadata(): Record<string, string> {
    const base: Record<string, string> = {
      apartment: this.apartment,
      guestName: this.guestName,
      guestEmail: this.guestEmail,
      checkInDate: this.checkInDate,
      checkOutDate: this.checkOutDate,
      guestsCount: this.guestsCount.toString(),
      totalPrice: this.amount.toString(),
      guestPhone: this.guestPhone || '',
      guestAddress: this.guestAddress || '',
      hotelId: this.hotelId || '',
      rooms: this.rooms || '[]',
      currency: (this.currency || 'RON').toUpperCase(),
    };
    if (this.promoCode) {
      base.promoCode = this.promoCode;
    }
    return base;
  }
}
