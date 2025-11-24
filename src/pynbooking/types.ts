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
