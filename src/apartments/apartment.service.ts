import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Apartment } from './apartment.schema';
import { Reservation } from '../reservation/reservation.schema';
import { Model, Types } from 'mongoose';
import { ApartmentDto } from './dto/apartment.dto';
import { handleDbError } from '../helpers/handleDbError';
import { mapDocumentToDto } from '../utils/mapper.util';

@Injectable()
export class ApartmentService {
  constructor(
    @InjectModel(Apartment.name) private apartmentModel: Model<Apartment>,
    @InjectModel(Reservation.name) private reservationModel: Model<Reservation>,
  ) {}

  async findAll(): Promise<Apartment[]> {
    const apartments = await this.apartmentModel.find().exec();

    return apartments.map((apt) => mapDocumentToDto(apt));
  }

  async findByCity(city: string): Promise<Apartment[]> {
    const apartments = await this.apartmentModel.find({ city }).exec();

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

  async update(id: string, apartmentDto: ApartmentDto): Promise<Apartment> {
    try {
      const updatedApartment = await this.apartmentModel
        .findByIdAndUpdate(id, apartmentDto, { new: true })
        .exec();

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
}
