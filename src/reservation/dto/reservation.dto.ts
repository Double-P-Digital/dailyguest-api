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
}

export class CreateReservationDto {
  @IsNumber()
  @IsNotEmpty()
  hotelId: number | undefined;

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

  @IsString()
  @IsNotEmpty()
  guestPhone: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateReservationRoomDto)
  rooms: CreateReservationRoomDto[];
}
