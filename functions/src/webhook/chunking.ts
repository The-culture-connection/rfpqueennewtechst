/**
 * Chunk large arrays for webhook delivery
 */

export function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

export function calculateTotalPages(totalItems: number, chunkSize: number): number {
  return Math.ceil(totalItems / chunkSize);
}
