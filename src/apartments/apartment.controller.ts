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
import { BlockDateDto, PriceOverrideDto } from './dto/date-management.dto';
import { CalculatePriceDto } from './dto/calculate-price.dto';
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

  // Blocked Dates Endpoints
  @Post(':id/block-dates')
  blockDates(@Param('id') apartmentId: string, @Body() blockDateDto: BlockDateDto) {
    return this.apartmentService.blockDates(apartmentId, blockDateDto);
  }

  @Get(':id/blocked-dates')
  getBlockedDates(@Param('id') apartmentId: string) {
    return this.apartmentService.getBlockedDates(apartmentId);
  }

  @Delete('blocked-dates/:blockId')
  deleteBlockedDate(@Param('blockId') blockId: string) {
    return this.apartmentService.deleteBlockedDate(blockId);
  }

  // Price Override Endpoints
  @Post(':id/price-override')
  setPriceOverride(@Param('id') apartmentId: string, @Body() priceOverrideDto: PriceOverrideDto) {
    return this.apartmentService.setPriceOverride(apartmentId, priceOverrideDto);
  }

  @Get(':id/price-overrides')
  getPriceOverrides(@Param('id') apartmentId: string) {
    return this.apartmentService.getPriceOverrides(apartmentId);
  }

  @Delete('price-overrides/:overrideId')
  deletePriceOverride(@Param('overrideId') overrideId: string) {
    return this.apartmentService.deletePriceOverride(overrideId);
  }

  // Calculate Price with Overrides
  @Get(':id/calculate-price')
  async calculatePrice(
    @Param('id') apartmentId: string,
    @Query('checkInDate') checkInDate: string,
    @Query('checkOutDate') checkOutDate: string,
  ) {
    return this.apartmentService.calculatePriceForRange(
      apartmentId,
      new Date(checkInDate),
      new Date(checkOutDate),
    );
  }

  // Check if date range is blocked
  @Get(':id/check-blocked')
  async checkBlocked(
    @Param('id') apartmentId: string,
    @Query('checkInDate') checkInDate: string,
    @Query('checkOutDate') checkOutDate: string,
  ) {
    return this.apartmentService.isRangeBlocked(
      apartmentId,
      new Date(checkInDate),
      new Date(checkOutDate),
    );
  }
}
