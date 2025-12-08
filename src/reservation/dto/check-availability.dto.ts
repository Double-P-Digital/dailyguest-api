import {IsString,IsNotEmpty,IsDateString,IsNumber,IsOptional,} from 'class-validator';
import { Type } from 'class-transformer';

export class CheckAvailabilityDto {
  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  hotelId: number;

  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  roomId: number;

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


