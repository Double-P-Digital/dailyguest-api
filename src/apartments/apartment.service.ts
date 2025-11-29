import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Apartment } from './apartment.schema';
import { Model } from 'mongoose';
import { ApartmentDto } from './dto/apartment.dto';
import { handleDbError } from '../helpers/handleDbError';
import { mapDocumentToDto } from '../utils/mapper.util';

@Injectable()
export class ApartmentService {
  constructor(
    @InjectModel(Apartment.name) private apartmentModel: Model<Apartment>,
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
      console.log('UPDATE: id param =', id);
      console.log('UPDATE: apartmentDto =', apartmentDto);

      const { id: dtoId, ...updateData } = apartmentDto;
      console.log('UPDATE: updateData (without id) =', updateData);

      const updatedApartment = await this.apartmentModel
        .findByIdAndUpdate(id, updateData, { new: true })
        .exec();

      console.log('UPDATE: result =', updatedApartment);

      if (!updatedApartment) {
        throw new NotFoundException(`Apartment with ID ${id} not found`);
      }

      return mapDocumentToDto(updatedApartment);
    } catch (error) {
      console.error('UPDATE ERROR:', error);
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
}
