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

export interface AuthResponse {
  userId?: number;
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  email: string;
  fullName: string;
  roles: string[];
}

export interface Genre {
  genreId: number;
  name?: string;
  genreName?: string;
}

export interface Director {
  directorId: number;
  name: string;
  bio?: string;
}

export interface Actor {
  actorId: number;
  name: string;
  avatarUrl?: string;
}

export interface MovieActor {
  actorId: number;
  actor: Actor;
  roleName?: string;
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
  director?: Director;
  directorName?: string;
  movieActors?: MovieActor[];
  actors?: { actorId: number; actorName: string }[];
  ageRatingId?: number;
  status?: string;
  isFeatured?: boolean;
}

export interface Cinema {
  cinemaId: number;
  name: string;           // primary display name (may be populated from cinemaName)
  cinemaName?: string;    // backend DTO field alias
  address: string;
  city: string;
  cityName?: string;
  imageUrl?: string;
}


export interface Hall {
  hallId: number;
  cinemaId: number;
  name: string;
  hallTypeName: string;
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
}

export interface BookingSeat {
  bookingSeatId: number;
  bookingId: number;
  seatId: number;
  seat?: Seat;
  unitPrice: number;
}

export interface Booking {
  bookingId: number;
  bookingCode: string;
  userId: number;
  showtimeId: number;
  showtime?: Showtime;
  totalAmount: number;
  serviceFee: number;
  discountAmount: number;
  bookingStatus: 'Pending' | 'Confirmed' | 'Cancelled';
  createdAt: string;
  qrCodeUrl?: string;
  bookingSeats?: BookingSeat[];
  seats?: string[];
  movieTitle?: string;
  startTime?: string;
  hallName?: string;
  cinemaName?: string;
}

export interface Review {
  reviewId: number;
  userId: number;
  userName: string;
  movieId: number;
  movieTitle: string;
  rating: number;
  comment?: string;
  likesCount: number;
  createdAt: string;
}

export interface Notification {
  notificationId: number;
  userId: number;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

export interface PagedResult<T> {
  items: T[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
}
