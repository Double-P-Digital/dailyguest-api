import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsDate,
  IsArray,
  ArrayNotEmpty,
  IsMongoId,
  IsEnum,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DiscountType } from '../discountCode.schema';

export class CreateDiscountCodeDto {
  @IsString()
  @IsNotEmpty()
  readonly code: string;

  @IsEnum(DiscountType)
  @IsNotEmpty()
  readonly discountType: DiscountType;

  @IsNumber()
  @IsNotEmpty()
  @Min(0, { message: 'Value must be greater than or equal to 0' })
  @Max(100, { message: 'For percentage type, value must be between 0 and 100' })
  readonly value: number; // Preț fix (>= 0) sau procentaj (0-100)

  @IsString()
  @IsNotEmpty()
  readonly currency: string;

  @Type(() => Date)
  @IsDate()
  @IsNotEmpty()
  readonly expirationDate: Date;

  @IsArray()
  @ArrayNotEmpty()
  @IsMongoId({ each: true })
  readonly apartmentIds: string[];
}
