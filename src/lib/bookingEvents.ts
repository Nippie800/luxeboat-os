import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

export type BookingEventType =
  | "booked"
  | "confirmed"
  | "rescheduled"
  | "cancelled"
  | "completed";

export async function logBookingEvent(params: {
  bookingId: string;
  type: BookingEventType;
  message: string;
  actor?: string;
}) {
  const { bookingId, type, message, actor = "admin" } = params;

  await addDoc(collection(db, "bookingEvents"), {
    bookingId,
    type,
    message,
    actor,
    createdAt: serverTimestamp(),
  });
}