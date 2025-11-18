import {
  IsString,
  IsEmail,
  IsNotEmpty,
  IsDateString,
  IsNumber,
  IsMongoId,
  Min,
  IsEnum,
  IsOptional,
} from 'class-validator';

export class CreateReservationDto {
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
  checkInDate: Date;

  @IsDateString()
  @IsNotEmpty()
  checkOutDate: Date;

  @IsNumber()
  @Min(1)
  @IsOptional()
  guestsCount?: number = 1;

  @IsNumber()
  @IsNotEmpty()
  totalPrice: number;

  @IsString()
  @IsNotEmpty()
  paymentIntentId: string;

  @IsEnum(['pending', 'confirmed', 'cancelled'])
  @IsOptional()
  status?: string = 'pending';
}
