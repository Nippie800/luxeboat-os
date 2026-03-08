import {
  collection,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { logBookingEvent } from "@/lib/bookingEvents";

type Booking = {
  id: string;
  date: string;
  timeSlot: string;
  status: string;
  name?: string;
};

function bookingCutoffMs(date: string, timeSlot: string, lateMinutes = 30) {
  const bookingStart = new Date(`${date}T${timeSlot}:00`);
  return bookingStart.getTime() + lateMinutes * 60 * 1000;
}

export async function runAutoCancelSweepForDate(date: string) {
  const q = query(collection(db, "bookings"), where("date", "==", date));
  const snap = await getDocs(q);

  const now = Date.now();
  const updates: Promise<any>[] = [];

  snap.forEach((d) => {
    const booking = { id: d.id, ...(d.data() as Omit<Booking, "id">) };

    const shouldAutoCancel =
      ["booked", "confirmed"].includes(booking.status) &&
      bookingCutoffMs(booking.date, booking.timeSlot, 30) < now;

    if (!shouldAutoCancel) return;

    updates.push(
      updateDoc(doc(db, "bookings", booking.id), {
        status: "cancelled",
        autoCancelled: true,
        updatedAt: new Date().toISOString(),
      })
    );

    updates.push(
      updateDoc(doc(db, "slotLocks", booking.id), {
        status: "cancelled",
        updatedAt: new Date().toISOString(),
      }).catch(() => {})
    );

    updates.push(
      logBookingEvent({
        bookingId: booking.id,
        type: "cancelled",
        message:
          "Booking auto-cancelled after 30 minutes past scheduled time.",
        actor: "system",
      })
    );
  });

  await Promise.all(updates);
}