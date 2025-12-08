export type Room = {
  roomId: number;
  planId: number;
  quantity: number;
  price: number;
  pricePerDay: Record<string, number>[];
  noGuests: number;
};

export type PynbookingCreateReservationDto = {
  arrivalDate: string;
  departureDate: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  guestCountryCode: string;
  guestCity: string;
  guestAddress: string;
  currency: string;
  language: string;
  totalPrice: number;
  hotelId?: number;
  rooms: Room[];
};

export type PynbookingConfirmPaidResponse = {
  bookingId: number;
  status: string;
  message?: string;
};

export type PynBookingReservation = {
  id: string;
  checkInDate: string;
  checkOutDate: string;
  reservationType: string | number;
  roomName: string;
  status: string;
  checkIn: boolean;
  guestId: string;
  guestName: string;
  guestPhone: string;
  guests: Array<{
    guestId: string;
    guestName: string;
    guestPhone: string;
  }>;
};

export interface CheckAvailabilityResponse {
  available: boolean;
  message?: string;
  price?: number;
  pricePerDay?: number[];
}