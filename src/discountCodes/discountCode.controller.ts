import {
  Controller,
  Post,
  Body,
  Delete,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { DiscountCodeService } from './discountCode.service';
import { DiscountCode } from './discountCode.schema';
import { CreateDiscountCodeDto } from './dto/discountCodeDto.dto';
import { ApiKeyGuard } from '../security/guard';

@UseGuards(ApiKeyGuard)
@Controller('discount-codes')
export class DiscountCodeController {
  constructor(private readonly discountService: DiscountCodeService) {}

  @Post()
  async create(
    @Body() createDto: CreateDiscountCodeDto,
  ): Promise<DiscountCode> {
    return this.discountService.create(createDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string): Promise<void> {
    return this.discountService.delete(id);
  }
}
