export function buildTicketQrPayload(bookingId: string, showId: string, seatIds: string[]): string {
  return JSON.stringify({ b: bookingId, s: showId, seats: seatIds, v: 1 })
}
