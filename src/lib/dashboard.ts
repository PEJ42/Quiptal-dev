export type DashboardBooking = {
  customerId: string;
  startDate: Date;
  totalCents: number;
};

export function isInCurrentMonth(value: Date, today = new Date()) {
  return (
    value.getUTCFullYear() === today.getUTCFullYear() && value.getUTCMonth() === today.getUTCMonth()
  );
}

export function calculateDashboardMetrics(bookings: DashboardBooking[], today = new Date()) {
  const todayDate = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
  );
  const upcoming = bookings.filter((booking) => booking.startDate >= todayDate);
  return {
    upcomingBookings: upcoming.length,
    upcomingRevenueCents: upcoming.reduce((sum, booking) => sum + booking.totalCents, 0),
    bookingsThisMonth: bookings.filter((booking) => isInCurrentMonth(booking.startDate, today))
      .length,
    customersWithUpcomingBookings: new Set(upcoming.map((booking) => booking.customerId)).size,
  };
}
