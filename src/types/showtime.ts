import type { Showtime as BaseShowtime } from './index';

export interface ApiMovieFormat {
  movieFormatId: number;
  formatName: string;
}

export interface ApiMovie {
  id?: number;
  movieId?: number;
  title: string;
  duration: number;
  genre?: { genreName: string };
  posterUrl?: string;
  movieFormats?: ApiMovieFormat[];
}

export interface NormalizedMovie {
  movieId: number;
  title: string;
  duration: number;
  genreName?: string;
  posterUrl?: string;
  movieFormats?: ApiMovieFormat[];
  status?: string;
  releaseDate?: string;
  isFeatured?: boolean;
}

export interface ApiShowtime extends BaseShowtime {
  isCancelled?: boolean;
  soldSeats?: number;
  totalSeats?: number;
  priceId?: number;
  cinemaId?: number;
  cinemaName?: string;
  priceValue?: number;
}

export interface ApiPrice {
  priceId: number;
  ticketType: string;
  value: number;
}

export interface MappedHall {
  hallId: number;
  cinemaId: number;
  name: string;
  hallTypeName: string;
  hallName?: string;
  supportedFormats?: string[];
}

export interface DryRunShowtime {
  date: string;
  time: string;
  hallId: number;
  hallName: string;
  movieTitle: string;
  conflict: string | null;
  isValid: boolean;
  movieId?: number;
}

export interface ShowtimeCreateDto {
  movieId: number;
  hallId: number;
  priceId: number;
  startTime: string; // ISO string
}

export interface ShowtimeUpdateDto {
  movieId: number;
  hallId: number;
  priceId: number;
  startTime: string; // ISO string
}

export interface ShowtimeBatchCreateDto {
  movieId: number;
  hallId: number;
  priceId: number;
  mode: 'Manual' | 'Auto';
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  intervalType: 'Custom';
  customTimes: string[];
  maxShowsPerDay: number;
}

export interface ShowtimeQueryParams {
  PageNumber?: number;
  PageSize?: number;
  DateFrom?: string;
  DateTo?: string;
  CinemaId?: number;
  MovieId?: number;
}

export interface BatchCreateResult {
  success: boolean;
  createdShowtimes?: ApiShowtime[];
  skippedSlots?: any[];
  conflicts?: Array<{
    startTime: string;
    endTime: string;
    reason: string;
  }>;
}
