import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApartmentService } from './apartment.service';
import { Apartment } from './apartment.schema';
import { ApartmentDto } from './dto/apartment.dto';
import { ApiKeyGuard } from '../security/guard';

@UseGuards(ApiKeyGuard)
@Controller('/api/apartment-service')
export class ApartmentController {
  constructor(private readonly apartmentService: ApartmentService) {}

  @Get('all')
  findAll(): Promise<Apartment[]> {
    return this.apartmentService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<Apartment> {
    return this.apartmentService.findOne(id);
  }

  @Get(':city')
  findByCity(@Param('city') city: string): Promise<Apartment[]> {
    return this.apartmentService.findByCity(city);
  }

  @Post()
  create(@Body() apartment: ApartmentDto) {
    return this.apartmentService.create(apartment);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() apartment: ApartmentDto) {
    return this.apartmentService.update(id, apartment);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.apartmentService.delete(id);
  }
}
