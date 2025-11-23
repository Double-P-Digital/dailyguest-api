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
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateReservationProductDto {
  @IsNumber()
  @IsNotEmpty()
  productId: number;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  @Min(0)
  quantity: number;

  @IsNumber()
  @Min(0)
  price: number;

  @IsNumber()
  @IsOptional()
  unitPrice?: number;

  @IsNumber()
  @IsOptional()
  persons?: number;

  @IsNumber()
  @IsOptional()
  nights?: number;
}

export class CreateReservationRoomDto {
  @IsNumber()
  @IsNotEmpty()
  roomId: number;

  @IsNumber()
  @IsNotEmpty()
  planId: number;

  @IsNumber()
  @IsOptional()
  offerId?: number;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsNumber()
  @Min(0)
  price: number;

  @IsArray()
  @IsNotEmpty()
  pricePerDay: number[];

  @IsNumber()
  @Min(1)
  noGuests: number;

  @IsString()
  @IsOptional()
  voucherCode?: string;

  @IsNumber()
  @IsOptional()
  voucherDiscount?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateReservationProductDto)
  @IsOptional()
  products?: CreateReservationProductDto[];
}

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
  checkInDate: string;

  @IsDateString()
  @IsNotEmpty()
  checkOutDate: string;

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

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateReservationRoomDto)
  rooms: CreateReservationRoomDto[];
}
