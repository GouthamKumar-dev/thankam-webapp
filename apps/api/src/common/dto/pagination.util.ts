export function toSkipTake(page = 1, limit = 20) {
  return {
    skip: (page - 1) * limit,
    take: limit,
  };
}
