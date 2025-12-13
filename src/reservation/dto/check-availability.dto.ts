import {IsString,IsNotEmpty,IsDateString,IsNumber,IsOptional,} from 'class-validator';
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

  @IsDateString()
  @IsNotEmpty()
  checkInDate: string;

  @IsDateString()
  @IsNotEmpty()
  checkOutDate: string;

  @IsString()
  @IsOptional()
  currency?: string;
}


