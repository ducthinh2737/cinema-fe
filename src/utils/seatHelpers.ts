import type { Seat, Showtime } from '../types/seat';

/**
 * Calculates ticket price for a seat based on showtime base price and seat type multiplier.
 */
export const getTicketPrice = (seat: Seat, showtime: Showtime): number => {
  const basePrice = showtime.priceValue || 75000;
  let multiplier = 1.0;
  if (seat.seatTypeName === 'VIP') {
    multiplier = 1.2;
  } else if (seat.seatTypeName === 'Sweetbox') {
    multiplier = 1.5;
  }
  return Math.round(basePrice * multiplier);
};

/**
 * Calculates the total ticket price for an array of seats under a showtime.
 */
export const calculateTotalTicketPrice = (seats: Seat[], showtime: Showtime): number => {
  return seats.reduce((sum, s) => sum + getTicketPrice(s, showtime), 0);
};

/**
 * Standard currency formatter for VND.
 */
export const currencyFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND'
});

/**
 * Groups an array of seats by rowName.
 */
export const groupSeatsByRow = (seats: Seat[]): Record<string, Seat[]> => {
  return seats.reduce((groups, seat) => {
    const row = seat.rowName || 'A';
    if (!groups[row]) {
      groups[row] = [];
    }
    groups[row].push(seat);
    return groups;
  }, {} as Record<string, Seat[]>);
};
