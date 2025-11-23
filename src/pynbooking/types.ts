export type Product = {
  productId: number;
  name: string;
  quantity: number;
  price: number;
  unitPrice?: number;
  persons?: number;
  nights?: number;
};

export type Room = {
  roomId: number;
  planId: number;
  offerId?: number;
  quantity: number;
  price: number;
  pricePerDay: Record<string, number>[];
  noGuests: number;
  voucherCode?: string;
  voucherDiscount?: number;
  products?: Product[];
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
  comment?: string;
  currency: string;
  language: string;
  totalPrice: number;
  hotelId?: number;
  confirmUrl?: string;
  rooms: Room[];
};
