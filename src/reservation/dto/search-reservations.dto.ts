import {IsString,IsNotEmpty,IsDateString,IsNumber,IsOptional,Min,Max,} from 'class-validator';
import { Type } from 'class-transformer';

export class SearchReservationsDto {
  @IsDateString()
  @IsNotEmpty()
  date: string;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(31)
  days?: number;

  @IsString()
  @IsOptional()
  roomNo?: string;
}


