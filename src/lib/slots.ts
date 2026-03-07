export type OperatingHours = {
  weekdayStart: string;
  weekdayEnd: string;
  weekendStart: string;
  weekendEnd: string;
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
  date: string; // YYYY-MM-DD
  timeSlot: string; // HH:MM
  status: string;
  expiresAt?: string;
};

function isWeekend(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const day = dt.getDay();
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

function isBlockingBooking(b: BookingLite, nowMs: number) {
  if (["booked", "confirmed", "completed"].includes(b.status)) {
    return true;
  }

  if (b.status === "pending_payment") {
    const exp = b.expiresAt ? Date.parse(b.expiresAt) : 0;
    return exp > nowMs;
  }

  return false;
}

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
  const nowMs = Date.now();

  const blocked = new Set(
    existingBookings
      .filter((b) => isBlockingBooking(b, nowMs))
      .map((b) => b.timeSlot)
  );

  const slots: { time: string; available: boolean }[] = [];

  let current = startMins;

  for (let i = 0; i < settings.tripsPerDay; i++) {
    const slotTime = minutesToTime(current);
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