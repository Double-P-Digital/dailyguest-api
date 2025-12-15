import {
  CreateReservationDto,
  CreateReservationRoomDto,
} from '../reservation/dto/reservation.dto';
import { PynbookingCreateReservationDto, Room } from './types';

export class PynbookingFactory {
  static buildReservationPayload(
    dto: CreateReservationDto,
  ): PynbookingCreateReservationDto {
    const rooms: Room[] = dto.rooms.map((r: CreateReservationRoomDto) => {
      const start = new Date(dto.checkInDate);

      // Build pricePerDay as a single object { "2026-12-04": 240, "2026-12-05": 240 }
      const pricePerDayObj: Record<string, number> = {};
      r.pricePerDay.forEach((price, idx) => {
        const day = new Date(start);
        day.setDate(day.getDate() + idx);
        const dateStr = day.toISOString().split('T')[0];
        pricePerDayObj[dateStr] = price;
      });

      return {
        roomId: r.roomId,
        planId: r.planId,
        quantity: r.quantity,
        price: r.price,
        pricePerDay: pricePerDayObj,
        noGuests: r.noGuests,
      };
    });

    const currency = dto.rooms.length > 0 && dto.rooms[0].currency
      ? dto.rooms[0].currency.toUpperCase()
      : 'RON';

    return {
      arrivalDate: dto.checkInDate,
      departureDate: dto.checkOutDate,
      guestName: dto.guestName,
      guestEmail: dto.guestEmail,
      guestPhone: dto.guestPhone,
      guestCountryCode: 'RO',
      guestAddress: dto.guestAddress || 'N/A',
      currency: currency,
      language: 'RO',
      totalPrice: dto.totalPrice,
      hotelId: dto.hotelId || undefined,
      rooms,
    };
  }
}
