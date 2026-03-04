export type OperatingHours = {
  weekdayStart: string; // "10:00"
  weekdayEnd: string;   // "12:00"
  weekendStart: string; // "10:00"
  weekendEnd: string;   // "17:00"
};

export type GeneralSettings = {
  rideDurationMinutes: number;
  bufferMinutes: number;
  maxGuests: number;
  tripsPerDay: number;
  depositPercentage: number;
  operatingHours: OperatingHours;
};

export type BookingLite = {
  date: string;     // "YYYY-MM-DD"
  timeSlot: string; // "HH:MM"
  status: string;   // pending_payment/booked/confirmed/cancelled/completed
};

function isWeekend(dateStr: string) {
  // dateStr: YYYY-MM-DD
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const day = dt.getDay(); // 0 Sun ... 6 Sat
  return day === 0 || day === 6;
}

function timeToMinutes(t: string) {
  const [hh, mm] = t.split(":").map(Number);
  return hh * 60 + mm;
}

function minutesToTime(mins: number) {
  const hh = Math.floor(mins / 60);
  const mm = mins % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

/**
 * Generate tripsPerDay slots starting at operatingStart.
 * Will stop early if it would exceed operatingEnd.
 */
export function generateSlots(
  dateStr: string,
  settings: GeneralSettings,
  existingBookings: BookingLite[]
) {
  const weekend = isWeekend(dateStr);

  const start = weekend
    ? settings.operatingHours.weekendStart
    : settings.operatingHours.weekdayStart;

  const end = weekend
    ? settings.operatingHours.weekendEnd
    : settings.operatingHours.weekdayEnd;

  const startMins = timeToMinutes(start);
  const endMins = timeToMinutes(end);

  const step = settings.rideDurationMinutes + settings.bufferMinutes;

  // Block any slot that has a booking that isn't cancelled
  const blocked = new Set(
    existingBookings
      .filter((b) => b.status !== "cancelled")
      .map((b) => b.timeSlot)
  );

  const slots: { time: string; available: boolean }[] = [];

  let current = startMins;
  for (let i = 0; i < settings.tripsPerDay; i++) {
    const slotTime = minutesToTime(current);

    // Ensure the ride fits before operating end
    const rideEnd = current + settings.rideDurationMinutes;
    if (rideEnd > endMins) break;

    slots.push({
      time: slotTime,
      available: !blocked.has(slotTime),
    });

    current += step;
  }

  return slots;
}