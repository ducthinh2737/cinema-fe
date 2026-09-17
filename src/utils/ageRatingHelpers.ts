export const getNormalizedAgeRatingId = (id: number | string | undefined): number => {
  if (id === undefined || id === null) return 1;
  const numId = typeof id === 'string' ? parseInt(id, 10) : id;
  if (isNaN(numId)) return 1;
  if (numId >= 13 && numId <= 18) {
    return numId - 12; // 13 -> 1, 14 -> 2, 15 -> 3, 16 -> 4, 17 -> 5, 18 -> 6
  }
  return numId;
};

export const getAgeRatingCode = (id: number | string | undefined): string => {
  const normalizedId = getNormalizedAgeRatingId(id);
  const ratings = ['P', 'K', 'T13', 'T16', 'T18', 'C18'];
  return ratings[normalizedId - 1] || 'P';
};

export const getAgeRatingColorClass = (id: number | string | undefined): string => {
  const normalizedId = getNormalizedAgeRatingId(id);
  switch (normalizedId) {
    case 1:
      return 'bg-green-600/80 border-green-500/30 text-white';
    case 2:
      return 'bg-blue-600/80 border-blue-500/30 text-white';
    case 3:
      return 'bg-orange-500/80 border-orange-500/30 text-white';
    case 4:
      return 'bg-red-500/80 border-red-500/30 text-white';
    case 5:
      return 'bg-red-850 border-red-800/30 text-white';
    case 6:
      return 'bg-pink-800/80 border-pink-700/30 text-white';
    default:
      return 'bg-green-600/80 border-green-500/30 text-white';
  }
};
