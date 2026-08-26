export function rentalAmountCents(booking: { totalCents: number; securityDepositCents: number }) {
  return Math.max(booking.totalCents - booking.securityDepositCents, 0);
}
