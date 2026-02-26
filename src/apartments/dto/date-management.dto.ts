import { IsDateString, IsIn, IsNumber, IsOptional, IsString } from 'class-validator';

export class BlockDateDto {
  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;
}

export class PriceOverrideDto {
  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsNumber()
  price: number;

  @IsOptional()
  @IsString()
  @IsIn(['RON', 'EUR', 'ron', 'eur'])
  currency?: string;
}
