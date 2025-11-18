import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DiscountCodeService } from './discountCode.service';
import { DiscountCodeController } from './discountCode.controller';
import { DiscountCode, DiscountCodeSchema } from './discountCode.schema';
import { Apartment, ApartmentSchema } from '../apartments/apartment.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DiscountCode.name, schema: DiscountCodeSchema },
      { name: Apartment.name, schema: ApartmentSchema },
    ]),
  ],
  controllers: [DiscountCodeController],
  providers: [DiscountCodeService],
})
export class DiscountCodeModule {}
