import {
  CreateReservationDto,
  CreateReservationProductDto,
  CreateReservationRoomDto,
} from '../reservation/dto/reservation.dto';
import { PynbookingCreateReservationDto, Room, Product } from './types';

export class PynbookingFactory {
  static buildReservationPayload(
    dto: CreateReservationDto,
    hotelId?: number,
    confirmUrl?: string,
  ): PynbookingCreateReservationDto {
    const rooms: Room[] = dto.rooms.map((r: CreateReservationRoomDto) => {
      const start = new Date(dto.checkInDate);
      const pricePerDay: Record<string, number>[] = r.pricePerDay.map(
        (price, idx) => {
          const day = new Date(start);
          day.setDate(day.getDate() + idx);
          const dateStr = day.toISOString().split('T')[0];
          return { [dateStr]: price };
        },
      );

      const products: Product[] | undefined = r.products?.map(
        (p: CreateReservationProductDto) => ({
          productId: p.productId,
          name: p.name,
          quantity: p.quantity,
          price: p.price,
          unitPrice: p.unitPrice,
          persons: p.persons,
          nights: p.nights,
        }),
      );

      return {
        roomId: r.roomId,
        planId: r.planId,
        offerId: r.offerId,
        quantity: r.quantity,
        price: r.price,
        pricePerDay,
        noGuests: r.noGuests,
        voucherCode: r.voucherCode,
        voucherDiscount: r.voucherDiscount,
        products,
      };
    });

    return {
      arrivalDate: dto.checkInDate,
      departureDate: dto.checkOutDate,
      guestName: dto.guestName,
      guestEmail: dto.guestEmail,
      guestPhone: '',
      guestCountryCode: '',
      guestCity: '',
      guestAddress: '',
      comment: '',
      currency: 'RON',
      language: 'RO',
      totalPrice: dto.totalPrice,
      hotelId,
      confirmUrl,
      rooms,
    };
  }
}
