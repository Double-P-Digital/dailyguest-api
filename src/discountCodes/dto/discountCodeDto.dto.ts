import {
  IsString,
  IsNotEmpty,
  IsInt,
  IsDate,
  IsArray,
  ArrayNotEmpty,
  IsMongoId,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateDiscountCodeDto {
  @IsString()
  @IsNotEmpty()
  readonly code: string;

  @IsInt()
  @IsNotEmpty()
  readonly price: number;

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
