"use client";

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

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
};

type BookingEvent = {
  id: string;
  type: string;
  message: string;
  actor?: string;
  createdAt?: any;
};

type Props = {
  booking: Booking | null;
  onClose: () => void;
  onConfirm: (id: string) => void;
  onCancel: (id: string) => void;
  onMarkCompleted: (id: string) => void;
  onReschedule: (id: string) => void;
};

function formatMoney(amount: number) {
  return `R ${Number(amount || 0).toLocaleString("en-ZA")}`;
}

function statusBadge(status: string) {
  switch (status) {
    case "confirmed":
      return "bg-green-100 text-green-700";
    case "booked":
      return "bg-blue-100 text-blue-700";
    case "completed":
      return "bg-gray-200 text-gray-800";
    case "cancelled":
      return "bg-red-100 text-red-700";
    case "pending_payment":
      return "bg-yellow-100 text-yellow-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

function formatEventTime(value: any) {
  try {
    if (!value) return "Unknown time";

    if (typeof value?.toDate === "function") {
      return value.toDate().toLocaleString();
    }

    if (value?.seconds) {
      return new Date(value.seconds * 1000).toLocaleString();
    }

    return String(value);
  } catch {
    return "Unknown time";
  }
}

export default function BookingDetailModal({
  booking,
  onClose,
  onConfirm,
  onCancel,
  onMarkCompleted,
  onReschedule,
}: Props) {
  const [events, setEvents] = useState<BookingEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);

  useEffect(() => {
    async function loadEvents() {
      if (!booking) return;

      setLoadingEvents(true);

      try {
        const q = query(
          collection(db, "bookingEvents"),
          where("bookingId", "==", booking.id),
          orderBy("createdAt", "desc")
        );

        const snap = await getDocs(q);
        const list: BookingEvent[] = [];

        snap.forEach((d) => {
          list.push({
            id: d.id,
            ...(d.data() as Omit<BookingEvent, "id">),
          });
        });

        setEvents(list);
      } catch {
        setEvents([]);
      } finally {
        setLoadingEvents(false);
      }
    }

    loadEvents();
  }, [booking]);

  if (!booking) return null;

  const isPaid =
    booking.status === "booked" ||
    booking.status === "confirmed" ||
    booking.status === "completed";

  function sendWhatsApp() {
    const msg = encodeURIComponent(
      `Hi ${booking!.name}, your ${booking!.timeSlot} LuxeBoat ride is confirmed. Please arrive 15 minutes early.`
    );

    window.open(`https://wa.me/${booking!.phone}?text=${msg}`);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-4xl rounded-2xl bg-white shadow-2xl">

        {/* HEADER */}

        <div className="flex items-start justify-between border-b p-6">
          <div>
            <h3 className="text-xl font-semibold">{booking.name}</h3>
            <p className="mt-1 text-sm text-gray-500">
              {booking.date} • {booking.timeSlot}
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg border px-3 py-2 text-sm"
          >
            Close
          </button>
        </div>

        {/* BODY */}

        <div className="grid gap-6 p-6 lg:grid-cols-3">

          {/* INFO */}

          <div className="space-y-4">
            <InfoRow label="Phone" value={booking.phone} />
            <InfoRow label="Guests" value={String(booking.guests)} />
            <InfoRow label="Package" value={booking.tier} />
            <InfoRow label="Paid" value={isPaid ? "Yes" : "No"} />
            <InfoRow label="Deposit" value={formatMoney(booking.depositAmount)} />
            <InfoRow label="Total" value={formatMoney(booking.totalAmount)} />

            {booking.paidAt && (
              <InfoRow label="Paid At" value={booking.paidAt} />
            )}

            <div>
              <div className="text-sm text-gray-500">Status</div>

              <span
                className={`inline-block mt-2 rounded-full px-3 py-1 text-xs font-medium ${statusBadge(
                  booking.status
                )}`}
              >
                {booking.status}
              </span>
            </div>
          </div>

          {/* ADDONS */}

          <div>
            <div className="text-sm text-gray-500">Add-Ons</div>

            <div className="mt-2 rounded-xl border bg-gray-50 p-4">
              {booking.addOns?.length ? (
                booking.addOns.map((item) => (
                  <div
                    key={item.id}
                    className="flex justify-between text-sm"
                  >
                    <span>{item.label}</span>
                    <span>{formatMoney(item.price)}</span>
                  </div>
                ))
              ) : (
                <div className="text-sm text-gray-500">
                  No add-ons selected
                </div>
              )}
            </div>
          </div>

          {/* TIMELINE */}

          <div>
            <div className="text-sm text-gray-500">Booking Timeline</div>

            <div className="mt-2 rounded-xl border bg-gray-50 p-4 max-h-[320px] overflow-y-auto">

              {loadingEvents ? (
                <div className="text-sm text-gray-500">
                  Loading timeline...
                </div>
              ) : events.length === 0 ? (
                <div className="text-sm text-gray-500">
                  No activity yet.
                </div>
              ) : (
                <div className="space-y-3">

                  {events.map((event) => (
                    <div
                      key={event.id}
                      className="rounded-xl border bg-white p-3"
                    >
                      <div className="text-xs uppercase text-gray-500">
                        {event.type}
                      </div>

                      <div className="text-sm font-medium mt-1">
                        {event.message}
                      </div>

                      <div className="text-xs text-gray-500 mt-1">
                        {formatEventTime(event.createdAt)}
                      </div>
                    </div>
                  ))}

                </div>
              )}

            </div>
          </div>
        </div>

        {/* ACTIONS */}

        <div className="flex flex-wrap gap-2 border-t p-6">

          {booking.status === "booked" && (
            <button
              onClick={() => onConfirm(booking.id)}
              className="bg-emerald-500 text-white px-4 py-2 rounded-lg"
            >
              Confirm Booking
            </button>
          )}

          {booking.status === "confirmed" && (
            <button
              onClick={() => onMarkCompleted(booking.id)}
              className="bg-indigo-500 text-white px-4 py-2 rounded-lg"
            >
              Mark Completed
            </button>
          )}

          {booking.status !== "cancelled" &&
            booking.status !== "completed" && (
              <button
                onClick={() => onCancel(booking.id)}
                className="bg-rose-500 text-white px-4 py-2 rounded-lg"
              >
                Cancel
              </button>
            )}

          <button
            onClick={() => onReschedule(booking.id)}
            className="border px-4 py-2 rounded-lg"
          >
            Reschedule
          </button>

          <button
            onClick={sendWhatsApp}
            className="bg-green-500 text-white px-4 py-2 rounded-lg"
          >
            Send WhatsApp
          </button>

        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-sm text-gray-500">{label}</div>
      <div className="mt-1 font-medium">{value}</div>
    </div>
  );
}