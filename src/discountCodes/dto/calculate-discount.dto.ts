import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsArray,
  IsMongoId,
  Min,
  IsOptional,
} from 'class-validator';

export class CalculateDiscountDto {
  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  originalPrice: number;

  @IsString()
  @IsNotEmpty()
  discountCode: string; // Codul discount-ului (ex: "SUMMER20")

  @IsArray()
  @IsMongoId({ each: true })
  @IsOptional()
  apartmentIds?: string[]; // Opțional - pentru validare că discount-ul este pentru aceste apartamente
}

