export interface User {
  userId: number;
  email: string;
  phoneNumber: string;
  fullName: string;
  dateOfBirth?: string;
  gender?: string;
  avatarUrl?: string;
  isEmailVerified: boolean;
  membershipPoints: number;
  roles?: string[];
}

export interface Genre {
  genreId: number;
  name?: string;
  genreName?: string;
}

export interface Hall {
  hallId: number;
  cinemaId: number;
  name: string;
  hallTypeName: string;
}

export interface Movie {
  id: number;
  title: string;
  slug: string;
  description?: string;
  duration: number;
  language: string;
  posterUrl?: string;
  bannerUrl?: string;
  trailerUrl?: string;
  releaseDate: string;
  endDate: string;
  rating: number;
  genreId: number;
  genre?: Genre;
  genreName?: string;
}

export interface Showtime {
  showtimeId: number;
  movieId: number;
  movie?: Movie;
  movieTitle?: string;
  hallId: number;
  hall?: Hall;
  startTime: string;
  endTime: string;
  priceMultiplier?: number;
  availableSeats: number;
  cinemaId?: number;
  cinemaName?: string;
  hallName?: string;
  priceValue?: number;
}

export interface Seat {
  seatId: number;
  hallId: number;
  rowName: string;
  seatNumber: number;
  seatTypeName: string; // "Standard", "VIP", "Sweetbox"
  status?: "Available" | "Selected" | "Locked" | "Booked";
  lockedBy?: string;
  lockedBySession?: string;
}

export interface SeatLockPayload {
  showtimeId: number;
  seatIds: number[];
  userId: string;
}

export interface SeatsReleasedPayload {
  showtimeId: number;
  seatIds: number[];
  userId?: string;
  reason?: string;
}

export interface BookingConfirmedPayload {
  showtimeId: number;
  seatIds: number[];
}

export interface Voucher {
  promoCode: string;
  discountAmount: number;
  description?: string;
}

export interface VoucherValidationResponse {
  success: boolean;
  message: string;
  data: {
    discountAmount: number;
    promoCode: string;
    description?: string;
  };
}

export interface BookingCreateResponse {
  success: boolean;
  message: string;
  data: {
    bookingId: number;
    bookingCode: string;
    totalAmount: number;
  };
}

export interface SeatHubResponse {
  success: boolean;
  message: string;
  seatIds: number[];
}
