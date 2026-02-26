import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Apartment } from './apartment.schema';
import { Reservation } from '../reservation/reservation.schema';
import { BlockedDate, BlockedDateDocument } from './blocked-date.schema';
import { PriceOverride, PriceOverrideDocument } from './price-override.schema';
import { Model, Types } from 'mongoose';
import { ApartmentDto } from './dto/apartment.dto';
import { BlockDateDto, PriceOverrideDto } from './dto/date-management.dto';
import { handleDbError } from '../helpers/handleDbError';
import { mapDocumentToDto } from '../utils/mapper.util';

@Injectable()
export class ApartmentService {
  constructor(
    @InjectModel(Apartment.name) private apartmentModel: Model<Apartment>,
    @InjectModel(Reservation.name) private reservationModel: Model<Reservation>,
    @InjectModel(BlockedDate.name) private blockedDateModel: Model<BlockedDateDocument>,
    @InjectModel(PriceOverride.name) private priceOverrideModel: Model<PriceOverrideDocument>,
  ) {}

  async findAll(): Promise<Apartment[]> {
    const apartments = await this.apartmentModel
      .find()
      .sort({ displayOrder: 1 })
      .exec();

    return apartments.map((apt) => mapDocumentToDto(apt));
  }

  async findByCity(city: string): Promise<Apartment[]> {
    const apartments = await this.apartmentModel
      .find({ city })
      .sort({ displayOrder: 1 })
      .exec();

    return apartments.map((apt) => mapDocumentToDto(apt));
  }

  async findOne(apartmentId: string): Promise<Apartment> {
    if (!Types.ObjectId.isValid(apartmentId)) {
      throw new BadRequestException(`Invalid apartment ID format: ${apartmentId}`);
    }

    const apartment = await this.apartmentModel.findById(apartmentId).exec();
    if (!apartment) {
      throw new NotFoundException('Apartment not found');
    }

    return mapDocumentToDto(apartment);
  }

  async create(apartmentDto: ApartmentDto): Promise<Apartment> {
    try {
      const newApartment = new this.apartmentModel(apartmentDto);

      return await newApartment.save();
    } catch (error) {
      handleDbError(error);
    }
  }

  // async update(id: string, apartmentDto: ApartmentDto): Promise<Apartment> {
  //   try {
  //     const updatedApartment = await this.apartmentModel
  //       .findByIdAndUpdate(id, apartmentDto, { new: true })
  //       .exec();
  //
  //     return mapDocumentToDto(updatedApartment);
  //   } catch (error) {
  //     handleDbError(error);
  //   }
  // }
  async update(id: string, apartmentDto: ApartmentDto): Promise<Apartment> {
    try {
      const { id: dtoId, ...updateData } = apartmentDto;

      const updatedApartment = await this.apartmentModel
        .findByIdAndUpdate(id, updateData, { new: true })
        .exec();

      if (!updatedApartment) {
        throw new NotFoundException(`Apartment with ID ${id} not found`);
      }

      return mapDocumentToDto(updatedApartment);
    } catch (error) {
      handleDbError(error);
    }
  }
  async delete(id: string): Promise<Apartment> {
    const deleted = await this.apartmentModel.findByIdAndDelete(id).exec();
    if (!deleted) {
      throw new NotFoundException(`Apartment with ID ${id} not found`);
    }

    return mapDocumentToDto(deleted);
  }

  async findTopBooked(limit: number = 10): Promise<(Apartment & { bookingCount: number })[]> {
    const topBookedAggregation = await this.reservationModel.aggregate([
      {
        $match: {
          status: 'confirmed',
          apartment: { $exists: true, $ne: null }, // Doar rezervări cu apartment setat
        },
      },
      {
        $group: {
          _id: '$apartment',
          bookingCount: { $sum: 1 },
        },
      },
      {
        $sort: { bookingCount: -1 },
      },
      {
        $limit: limit,
      },
    ]);

    const apartmentBookingMap = new Map<string, number>();
    const apartmentIds: string[] = [];

    topBookedAggregation.forEach((item) => {
      if (item._id != null) {
        const apartmentId = item._id.toString();
        apartmentIds.push(apartmentId);
        apartmentBookingMap.set(apartmentId, item.bookingCount);
      }
    });

    if (apartmentIds.length === 0) {
      return [];
    }

    const apartments = await this.apartmentModel
      .find({ _id: { $in: apartmentIds } })
      .exec();

    const sortedApartments = apartmentIds
      .map((id) => {
        const apartment = apartments.find((apt) => apt._id.toString() === id.toString());
        if (!apartment) return null;
        
        const apartmentDto = mapDocumentToDto<Apartment>(apartment);
        const bookingCount = apartmentBookingMap.get(id) || 0;
        
        return {
          ...apartmentDto,
          bookingCount,
        };
      })
      .filter((apt) => apt !== null && apt.bookingCount > 0) as (Apartment & { bookingCount: number })[];

    return sortedApartments;
  }

  // Blocked Dates Methods
  async blockDates(apartmentId: string, blockDateDto: BlockDateDto): Promise<BlockedDate> {
    if (!Types.ObjectId.isValid(apartmentId)) {
      throw new BadRequestException(`Invalid apartment ID format: ${apartmentId}`);
    }

    const apartment = await this.apartmentModel.findById(apartmentId).exec();
    if (!apartment) {
      throw new NotFoundException('Apartment not found');
    }

    try {
      const blockedDate = new this.blockedDateModel({
        apartmentId: new Types.ObjectId(apartmentId),
        startDate: new Date(blockDateDto.startDate),
        endDate: new Date(blockDateDto.endDate),
        isActive: true,
      });

      return await blockedDate.save();
    } catch (error) {
      handleDbError(error);
    }
  }

  async getBlockedDates(apartmentId: string): Promise<BlockedDate[]> {
    if (!Types.ObjectId.isValid(apartmentId)) {
      throw new BadRequestException(`Invalid apartment ID format: ${apartmentId}`);
    }

    return await this.blockedDateModel
      .find({
        apartmentId: new Types.ObjectId(apartmentId),
        isActive: true,
        endDate: { $gte: new Date() }, // Only return future or current blocks
      })
      .sort({ startDate: 1 })
      .exec();
  }

  async deleteBlockedDate(blockId: string): Promise<void> {
    if (!Types.ObjectId.isValid(blockId)) {
      throw new BadRequestException(`Invalid block ID format: ${blockId}`);
    }

    const result = await this.blockedDateModel.findByIdAndDelete(blockId).exec();
    if (!result) {
      throw new NotFoundException('Blocked date not found');
    }
  }

  // Price Override Methods
  async setPriceOverride(apartmentId: string, priceOverrideDto: PriceOverrideDto): Promise<PriceOverride> {
    if (!Types.ObjectId.isValid(apartmentId)) {
      throw new BadRequestException(`Invalid apartment ID format: ${apartmentId}`);
    }

    const apartment = await this.apartmentModel.findById(apartmentId).exec();
    if (!apartment) {
      throw new NotFoundException('Apartment not found');
    }

    try {
      const currency = priceOverrideDto.currency?.toUpperCase() || 'EUR';
      
      const priceOverride = new this.priceOverrideModel({
        apartmentId: new Types.ObjectId(apartmentId),
        startDate: new Date(priceOverrideDto.startDate),
        endDate: new Date(priceOverrideDto.endDate),
        price: priceOverrideDto.price,
        currency: currency,
        isActive: true,
      });

      return await priceOverride.save();
    } catch (error) {
      handleDbError(error);
    }
  }

  async getPriceOverrides(apartmentId: string): Promise<PriceOverride[]> {
    if (!Types.ObjectId.isValid(apartmentId)) {
      throw new BadRequestException(`Invalid apartment ID format: ${apartmentId}`);
    }

    return await this.priceOverrideModel
      .find({
        apartmentId: new Types.ObjectId(apartmentId),
        isActive: true,
        endDate: { $gte: new Date() }, // Only return future or current overrides
      })
      .sort({ startDate: 1 })
      .exec();
  }

  async deletePriceOverride(overrideId: string): Promise<void> {
    if (!Types.ObjectId.isValid(overrideId)) {
      throw new BadRequestException(`Invalid override ID format: ${overrideId}`);
    }

    const result = await this.priceOverrideModel.findByIdAndDelete(overrideId).exec();
    if (!result) {
      throw new NotFoundException('Price override not found');
    }
  }

  // Helper method to check if a date is blocked
  async isDateBlocked(apartmentId: string, date: Date): Promise<boolean> {
    const count = await this.blockedDateModel.countDocuments({
      apartmentId: new Types.ObjectId(apartmentId),
      isActive: true,
      startDate: { $lte: date },
      endDate: { $gte: date },
    });

    return count > 0;
  }

  // Helper method to get price for a specific date (considering overrides)
  async getPriceForDate(apartmentId: string, date: Date): Promise<{ price: number; currency: string }> {
    const apartment = await this.findOne(apartmentId);

    const priceOverride = await this.priceOverrideModel.findOne({
      apartmentId: new Types.ObjectId(apartmentId),
      isActive: true,
      startDate: { $lte: date },
      endDate: { $gte: date },
    }).exec();

    if (priceOverride) {
      return {
        price: priceOverride.price,
        currency: priceOverride.currency || 'RON',
      };
    }

    return {
      price: apartment.price,
      currency: (apartment as any).currency || 'RON',
    };
  }

  // Calculate total price for a date range with overrides
  async calculatePriceForRange(apartmentId: string, checkInDate: Date, checkOutDate: Date): Promise<{
    totalPrice: number;
    nightlyPrices: { date: string; price: number; currency: string }[];
    averagePrice: number;
    hasOverrides: boolean;
    currency: string;
  }> {
    const apartment = await this.findOne(apartmentId);
    
    const nightlyPrices: { date: string; price: number; currency: string }[] = [];
    let totalPrice = 0;
    let hasOverrides = false;
    let primaryCurrency = 'RON';
    
    // Iterate through each night
    const currentDate = new Date(checkInDate);
    const endDate = new Date(checkOutDate);
    
    while (currentDate < endDate) {
      const priceInfo = await this.getPriceForDate(apartmentId, currentDate);
      
      if (priceInfo.price !== apartment.price) {
        hasOverrides = true;
      }
      
      // Set primary currency from first override or keep EUR
      if (nightlyPrices.length === 0) {
        primaryCurrency = priceInfo.currency;
      }
      
      nightlyPrices.push({
        date: currentDate.toISOString().split('T')[0],
        price: priceInfo.price,
        currency: priceInfo.currency,
      });
      
      totalPrice += priceInfo.price;
      
      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    const nights = nightlyPrices.length;
    const averagePrice = nights > 0 ? totalPrice / nights : apartment.price;
    
    return {
      totalPrice,
      nightlyPrices,
      averagePrice,
      hasOverrides,
      currency: primaryCurrency,
    };
  }

  // Check if a date range is blocked
  async isRangeBlocked(apartmentId: string, checkInDate: Date, checkOutDate: Date): Promise<{
    isBlocked: boolean;
    blockedDates?: BlockedDate[];
    message?: string;
  }> {
    const blockedDates = await this.blockedDateModel.find({
      apartmentId: new Types.ObjectId(apartmentId),
      isActive: true,
      $or: [
        // Block overlaps with check-in to check-out range
        {
          startDate: { $lte: checkOutDate },
          endDate: { $gte: checkInDate },
        },
      ],
    }).exec();

    if (blockedDates.length > 0) {
      const dateRanges = blockedDates.map(b => 
        `${b.startDate.toLocaleDateString('ro-RO')} - ${b.endDate.toLocaleDateString('ro-RO')}`
      ).join(', ');
      
      return {
        isBlocked: true,
        blockedDates,
        message: `Perioada selectată nu este disponibilă. Date blocate: ${dateRanges}`,
      };
    }

    return {
      isBlocked: false,
    };
  }
}
