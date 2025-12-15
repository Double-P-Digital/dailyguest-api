import {IsString,IsNotEmpty,IsNumber,IsOptional,} from 'class-validator';
import { Type } from 'class-transformer';

export class CheckAvailabilityDto {
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  hotelId?: number;

  @IsString()
  @IsNotEmpty()
  roomType: string;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  roomId?: number;

  @IsString()
  @IsNotEmpty()
  checkInDate: string;

  @IsString()
  @IsNotEmpty()
  checkOutDate: string;

  @IsString()
  @IsOptional()
  currency?: string;
}


