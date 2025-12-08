import {
  Controller,
  Post,
  Body,
  Delete,
  Param,
  UseGuards,
  Get,
  ValidationPipe,
} from '@nestjs/common';
import { DiscountCodeService } from './discountCode.service';
import { DiscountCode } from './discountCode.schema';
import { CreateDiscountCodeDto } from './dto/discountCodeDto.dto';
import { CalculateDiscountDto } from './dto/calculate-discount.dto';
import { ApiKeyGuard } from '../security/guard';

@UseGuards(ApiKeyGuard)
@Controller('/api/discount-code-service')
export class DiscountCodeController {
  constructor(private readonly discountService: DiscountCodeService) {}

  @Post()
  async create(
    @Body() createDto: CreateDiscountCodeDto,
  ): Promise<DiscountCode> {
    return this.discountService.create(createDto);
  }

  @Get('all')
  async findAll(): Promise<DiscountCode[]> {
    return this.discountService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<DiscountCode> {
    return this.discountService.findOne(id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string): Promise<void> {
    return this.discountService.delete(id);
  }

  @Post('calculate')
  async calculateDiscount(
    @Body(new ValidationPipe()) calculateDto: CalculateDiscountDto,
  ) {
    return this.discountService.calculateDiscount(calculateDto);
  }
}
