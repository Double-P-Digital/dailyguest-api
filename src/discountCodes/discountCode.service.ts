import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateDiscountCodeDto } from './dto/discountCodeDto.dto';
import { CalculateDiscountDto } from './dto/calculate-discount.dto';
import { DiscountCode, DiscountType } from './discountCode.schema';
import { Apartment } from '../apartments/apartment.schema';
import { mapDocumentToDto } from '../utils/mapper.util';

@Injectable()
export class DiscountCodeService {
  static calculateDiscountAmount(
    originalPrice: number,
    discountType: DiscountType,
    discountValue: number,
  ): number {
    if (discountType === DiscountType.FIXED) {
      return Math.min(discountValue, originalPrice);
    } else {
      return (originalPrice * discountValue) / 100;
    }
  }

  static calculateFinalPrice(
    originalPrice: number,
    discountType: DiscountType,
    discountValue: number,
  ): number {
    const discountAmount = this.calculateDiscountAmount(
      originalPrice,
      discountType,
      discountValue,
    );
    return Math.max(0, originalPrice - discountAmount);
  }
  constructor(
    @InjectModel(DiscountCode.name) private discountModel: Model<DiscountCode>,
    @InjectModel(Apartment.name) private apartmentModel: Model<Apartment>,
  ) {}

  async create(createDto: CreateDiscountCodeDto): Promise<DiscountCode> {
    const newCode = new this.discountModel({
      code: createDto.code,
      discountType: createDto.discountType,
      value: createDto.value,
      expirationDate: createDto.expirationDate,
      apartmentIds: createDto.apartmentIds,
    });

    const savedCode = await newCode.save();
    await this.apartmentModel.updateMany(
      { _id: { $in: createDto.apartmentIds } },
      { $set: { discountCode: savedCode._id } },
    );

    return mapDocumentToDto(savedCode);
  }

  async findAll(): Promise<DiscountCode[]> {
    const discountCodes = await this.discountModel.find().exec();
    return discountCodes.map((code) => mapDocumentToDto(code));
  }

  async findOne(id: string): Promise<DiscountCode> {
    const discountCode = await this.discountModel.findById(id).exec();

    if (!discountCode) {
      throw new NotFoundException('Discount Code not found');
    }

    return mapDocumentToDto(discountCode);
  }

  async delete(codeId: string): Promise<void> {
    const code = await this.discountModel.findById(codeId).exec();

    if (!code) {
      throw new NotFoundException(
        `Discount Code with ID "${codeId}" not found.`,
      );
    }

    await this.apartmentModel.updateMany(
      { discountCode: codeId },
      { $unset: { discountCode: '' } },
    );

    await code.deleteOne();
  }

  async calculateDiscount(calculateDto: CalculateDiscountDto) {
    const discountCode = await this.discountModel
      .findOne({ code: calculateDto.discountCode.toUpperCase() })
      .exec();

    if (!discountCode) {
      throw new NotFoundException(
        `Discount code "${calculateDto.discountCode}" not found.`,
      );
    }

    const now = new Date();
    if (new Date(discountCode.expirationDate) < now) {
      throw new BadRequestException(
        `Discount code "${calculateDto.discountCode}" has expired.`,
      );
    }

    if (
      calculateDto.apartmentIds &&
      calculateDto.apartmentIds.length > 0
    ) {
      const validApartments = discountCode.apartmentIds.some((aptId) =>
        calculateDto.apartmentIds!.some(
          (reqAptId) => aptId.toString() === reqAptId,
        ),
      );

      if (!validApartments) {
        throw new BadRequestException(
          `Discount code "${calculateDto.discountCode}" is not valid for the selected apartments.`,
        );
      }
    }

    const discountAmount = DiscountCodeService.calculateDiscountAmount(
      calculateDto.originalPrice,
      discountCode.discountType,
      discountCode.value,
    );

    const finalPrice = DiscountCodeService.calculateFinalPrice(
      calculateDto.originalPrice,
      discountCode.discountType,
      discountCode.value,
    );

    return {
      originalPrice: calculateDto.originalPrice,
      discountAmount: Math.round(discountAmount * 100) / 100, // Round la 2 zecimale
      finalPrice: Math.round(finalPrice * 100) / 100, // Round la 2 zecimale
      discountCode: {
        code: discountCode.code,
        discountType: discountCode.discountType,
        value: discountCode.value,
      },
    };
  }
}
