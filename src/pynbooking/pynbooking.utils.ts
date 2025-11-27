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

      const pricePerDay = r.pricePerDay.map((price, idx) => {
        const day = new Date(start);
        day.setDate(day.getDate() + idx);
        const dateStr = day.toISOString().split('T')[0];
        return { [dateStr]: price };
      });

      return {
        roomId: r.roomId,
        planId: r.planId,
        quantity: r.quantity,
        price: r.price,
        pricePerDay,
        noGuests: r.noGuests,
      };
    });

    return {
      arrivalDate: dto.checkInDate,
      departureDate: dto.checkOutDate,
      guestName: dto.guestName,
      guestEmail: dto.guestEmail,
      guestPhone: dto.guestPhone,
      guestCountryCode: 'RO',
      guestAddress: 'N/A',
      guestCity: 'N/A',
      currency: 'RON',
      language: 'RO',
      totalPrice: dto.totalPrice,
      hotelId: dto.hotelId || undefined,
      rooms,
    };
  }
}
