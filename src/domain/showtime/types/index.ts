
export interface TimelineShowtimeBlock {
  showtimeId?: number;
  movieId: number;
  movieTitle: string;
  posterUrl?: string;
  duration: number;
  startTime: string;
  endTime: string;
  leftPercent: number;
  widthPercent: number;
  isConflict: boolean;
  conflictReason: string | null;
  availableSeats?: number;
  totalSeats?: number;
  isCancelled?: boolean;
  isDb?: boolean;
  status?: 'upcoming' | 'showing' | 'finished';
}

export interface TimelineRange {
  startHour: number;
  endHour: number;
  totalMinutes: number;
}

export interface TimelineMatrixRow {
  hallId: number;
  hallName: string;
  hallTypeName: string;
  blocks: TimelineShowtimeBlock[];
}

export interface TimelineMatrixResult {
  matrix: TimelineMatrixRow[];
  timelineRange: TimelineRange;
}
