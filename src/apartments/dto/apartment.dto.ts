import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsArray,
  IsOptional,
  ArrayMinSize,
  IsMongoId,
} from 'class-validator';

export class ApartmentDto {
  @IsString()
  readonly hotelId: string;

  @IsOptional()
  @IsMongoId()
  readonly id?: string;

  @IsString()
  @IsNotEmpty()
  readonly name: string;

  @IsString()
  @IsNotEmpty()
  readonly address: string;

  @IsNumber()
  @IsNotEmpty()
  readonly price: number;

  @IsString()
  @IsOptional()
  readonly description: string;

  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  readonly amenities: string[];

  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  readonly images: string[];
}