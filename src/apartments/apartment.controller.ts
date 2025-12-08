import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
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

  @Get('top-booked')
  findTopBooked(@Query('limit') limit?: string): Promise<(Apartment & { bookingCount: number })[]> {
    const limitNumber = limit ? parseInt(limit, 10) : 10;
    return this.apartmentService.findTopBooked(limitNumber);
  }

  @Get('city/:city')
  findByCity(@Param('city') city: string): Promise<Apartment[]> {
    return this.apartmentService.findByCity(city);
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<Apartment> {
    return this.apartmentService.findOne(id);
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
