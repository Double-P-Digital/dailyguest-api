import { IsDateString, IsMongoId } from 'class-validator';

export class CalculatePriceDto {
  @IsMongoId()
  apartmentId: string;

  @IsDateString()
  checkInDate: string;

  @IsDateString()
  checkOutDate: string;
}
