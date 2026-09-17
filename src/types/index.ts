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
  tierName?: string;
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
  movieFormats?: { movieFormatId: number; formatName: string }[];
  ageRatingId?: number;
  status?: string;
  isFeatured?: boolean;
  averageRating?: number;
  reviewCount?: number;
  ratingSummary?: MovieRatingSummary;
}

export interface MovieRatingSummary {
  averageRating: number;
  totalReviews: number;
  fiveStarCount: number;
  fourStarCount: number;
  threeStarCount: number;
  twoStarCount: number;
  oneStarCount: number;
}

export interface Cinema {
  cinemaId: number;
  name: string;           // primary display name (may be populated from cinemaName)
  cinemaName?: string;    // backend DTO field alias
  address: string;
  city: string;
  cityName?: string;
  imageUrl?: string;
  cityId?: number;
  status?: string;
  openingTime?: string;
  closingTime?: string;
  googleMapsUrl?: string;
  latitude?: number;
  longitude?: number;
  logoUrl?: string;
  bannerUrl?: string;
  galleryUrls?: string;
  phone?: string;
  email?: string;
  hallCount?: number;
  seatCount?: number;
  createdAt?: string;
}


export interface Hall {
  hallId: number;
  cinemaId: number;
  name: string;
  hallName?: string;
  hallTypeId?: number;
  hallTypeName: string;
  capacity?: number;
  description?: string;
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
  price?: number;
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
  bookingStatus: 'Pending' | 'Confirmed' | 'Cancelled' | 'CheckedIn';
  createdAt: string;
  qrCodeUrl?: string;
  bookingSeats?: BookingSeat[];
  seats?: string[];
  movieTitle?: string;
  startTime?: string;
  hallName?: string;
  cinemaName?: string;
  moviePosterUrl?: string;
  movieBannerUrl?: string;
  movieDuration?: number;
}

export interface ReviewReply {
  reviewReplyId: number;
  reviewId: number;
  userId: number;
  userName: string;
  content: string;
  createdAt: string;
  parentReplyId?: number;
  parentReplyUserName?: string;
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
  dislikesCount: number;
  createdAt: string;
  isVerifiedViewer?: boolean;
  isApproved?: boolean;
  status: string;
  updatedAt?: string;
  replies: ReviewReply[];
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

export interface Product {
  id: number;
  name: string;
  price: number;
  imageUrl?: string;
  description?: string;
  isDeleted?: boolean;
  isActive?: boolean;
}

export interface ComboItem {
  productId: number;
  productName: string;
  quantity: number;
}

export interface Combo {
  id: number;
  name: string;
  description?: string;
  imageUrl?: string;
  price: number;
  originalPrice?: number;
  discountBadge?: string;
  displayOrder: number;
  isActive: boolean;
  comboItems: ComboItem[];
}

export interface OrderCombo {
  comboId: number;
  comboName: string;
  quantity: number;
  price: number;
}

export interface ComboRecommendation {
  combo: Combo;
  reason: string;
}
