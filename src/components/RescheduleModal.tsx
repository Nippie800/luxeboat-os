"use client";

import { useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  generateSlots,
  type BookingLite,
  type GeneralSettings,
} from "@/lib/slots";
import { logBookingEvent } from "@/lib/bookingEvents";

type Booking = {
  id: string;
  name: string;
  phone: string;
  date: string;
  timeSlot: string;
  guests: number;
  tier: string;
  totalAmount: number;
  depositAmount: number;
  status: string;
  paidAt?: string;
  addOns?: Array<{
    id: string;
    label: string;
    price: number;
  }>;
  baseAmount?: number;
  addOnsTotal?: number;
  expiresAt?: string;
  policies?: {
    lateCancelMinutes?: number;
    noRefund?: boolean;
    weatherHyacinthConfirmation?: boolean;
  };
};

type Props = {
  booking: Booking | null;
  onClose: () => void;
  onDone: () => void;
};

const DEFAULTS: GeneralSettings = {
  rideDurationMinutes: 45,
  bufferMinutes: 10,
  maxGuests: 6,
  tripsPerDay: 5,
  depositPercentage: 50,
  operatingHours: {
    weekdayStart: "10:00",
    weekdayEnd: "12:00",
    weekendStart: "10:00",
    weekendEnd: "17:00",
  },
};

function tomorrowStr() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function RescheduleModal({ booking, onClose, onDone }: Props) {
  const [settings, setSettings] = useState<GeneralSettings>(DEFAULTS);
  const [date, setDate] = useState(booking?.date || tomorrowStr());
  const [timeSlot, setTimeSlot] = useState("");
  const [bookings, setBookings] = useState<BookingLite[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!booking) return;
    setDate(booking.date);
    setTimeSlot("");
    setMsg(null);
  }, [booking]);

  useEffect(() => {
    async function loadSettings() {
      const ref = doc(db, "settings", "generalSettings");
      const snap = await getDoc(ref);
      if (snap.exists()) {
        setSettings({ ...DEFAULTS, ...(snap.data() as any) });
      }
    }

    loadSettings();
  }, []);

  useEffect(() => {
    async function loadBookingsForDate() {
      if (!booking || !date) return;

      setLoadingSlots(true);
      setMsg(null);

      try {
        const q = query(collection(db, "bookings"), where("date", "==", date));
        const snap = await getDocs(q);

        const list: BookingLite[] = [];
        snap.forEach((d) => {
          const data = d.data() as any;
          if (d.id === booking.id) return;

          list.push({
            date: data.date,
            timeSlot: data.timeSlot,
            status: data.status,
            expiresAt: data.expiresAt,
          });
        });

        setBookings(list);
      } catch (err: any) {
        setMsg(err?.message ?? "Failed to load slots");
      } finally {
        setLoadingSlots(false);
      }
    }

    loadBookingsForDate();
  }, [booking, date]);

  const slots = useMemo(() => {
    if (!date) return [];
    return generateSlots(date, settings, bookings);
  }, [date, settings, bookings]);

  async function handleReschedule() {
    if (!booking || !date || !timeSlot) {
      setMsg("Please select a new date and time slot.");
      return;
    }

    const newBookingId = `${date}_${timeSlot}`;
    if (newBookingId === booking.id) {
      setMsg("Please choose a different slot.");
      return;
    }

    const selectedSlot = slots.find((s) => s.time === timeSlot);
    if (!selectedSlot?.available) {
      setMsg("That slot is no longer available.");
      return;
    }

    setSaving(true);
    setMsg(null);

    try {
      const oldBookingRef = doc(db, "bookings", booking.id);
      const oldLockRef = doc(db, "slotLocks", booking.id);

      const newBookingRef = doc(db, "bookings", newBookingId);
      const newLockRef = doc(db, "slotLocks", newBookingId);

      await setDoc(
        newBookingRef,
        {
          ...booking,
          id: undefined,
          date,
          timeSlot,
          status: "booked",
          rescheduledFrom: booking.id,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      await setDoc(
        newLockRef,
        {
          date,
          timeSlot,
          status: "booked",
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      await updateDoc(oldBookingRef, {
        status: "cancelled",
        rescheduledTo: newBookingId,
        updatedAt: new Date().toISOString(),
      });

      await updateDoc(oldLockRef, {
        status: "cancelled",
        updatedAt: new Date().toISOString(),
      });

      await logBookingEvent({
        bookingId: booking.id,
        type: "rescheduled",
        message: `Booking rescheduled from ${booking.date} ${booking.timeSlot} to ${date} ${timeSlot}`,
      });

      await logBookingEvent({
        bookingId: newBookingId,
        type: "booked",
        message: `Booking created from reschedule of ${booking.id}`,
      });

      onDone();
      onClose();
    } catch (err: any) {
      setMsg(err?.message ?? "Failed to reschedule booking");
    } finally {
      setSaving(false);
    }
  }

  if (!booking) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b p-6">
          <div>
            <h3 className="text-xl font-semibold">Reschedule Booking</h3>
            <p className="mt-1 text-sm text-gray-500">
              Current: {booking.date} • {booking.timeSlot}
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg border px-3 py-2 text-sm"
          >
            Close
          </button>
        </div>

        <div className="space-y-5 p-6">
          <div>
            <label htmlFor="reschedule-date" className="block text-sm font-medium">
              New Date
            </label>
            <input
              id="reschedule-date"
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setTimeSlot("");
              }}
              className="mt-1 w-full rounded-xl border p-3"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Available Time Slots</label>

            {loadingSlots ? (
              <div className="mt-2 text-sm text-gray-500">Loading slots...</div>
            ) : (
              <div className="mt-2 grid grid-cols-3 gap-2">
                {slots.map((slot) => (
                  <button
                    key={slot.time}
                    disabled={!slot.available}
                    onClick={() => setTimeSlot(slot.time)}
                    className={`rounded-xl border p-2 text-sm ${
                      timeSlot === slot.time ? "border-black" : "border-gray-200"
                    } ${slot.available ? "bg-white" : "bg-gray-100 text-gray-400"}`}
                  >
                    {slot.time}
                  </button>
                ))}
              </div>
            )}
          </div>

          {msg && (
            <div className="rounded-xl bg-gray-100 px-4 py-3 text-sm text-gray-700">
              {msg}
            </div>
          )}
        </div>

        <div className="flex gap-2 border-t p-6">
          <button
            onClick={handleReschedule}
            disabled={saving || !date || !timeSlot}
            className="rounded-lg bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            {saving ? "Saving..." : "Confirm Reschedule"}
          </button>

          <button
            onClick={onClose}
            className="rounded-lg border px-4 py-2 text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}