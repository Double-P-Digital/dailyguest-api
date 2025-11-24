import {
  IsString,
  IsEmail,
  IsNotEmpty,
  IsDateString,
  IsNumber,
  Min,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateReservationProductDto {
  @IsNumber()
  productId: number;

  @IsString()
  name: string;

  @IsNumber()
  @Min(0)
  quantity: number;

  @IsNumber()
  @Min(0)
  price: number;
}

export class CreateReservationRoomDto {
  @IsNumber()
  @IsNotEmpty()
  roomId: number;

  @IsNumber()
  @IsNotEmpty()
  planId: number;

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

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateReservationProductDto)
  products: CreateReservationProductDto[];
}

export class CreateReservationDto {
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
  @IsNotEmpty()
  totalPrice: number;

  @IsString()
  @IsNotEmpty()
  paymentIntentId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateReservationRoomDto)
  rooms: CreateReservationRoomDto[];
}
