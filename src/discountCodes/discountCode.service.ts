import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateDiscountCodeDto } from './dto/discountCodeDto.dto';
import { DiscountCode } from './discountCode.schema';
import { Apartment } from '../apartments/apartment.schema';
import { mapDocumentToDto } from '../utils/mapper.util';

@Injectable()
export class DiscountCodeService {
  constructor(
    @InjectModel(DiscountCode.name) private discountModel: Model<DiscountCode>,
    @InjectModel(Apartment.name) private apartmentModel: Model<Apartment>,
  ) {}

  async create(createDto: CreateDiscountCodeDto): Promise<DiscountCode> {
    const newCode = new this.discountModel({
      code: createDto.code,
      price: createDto.price,
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
}
