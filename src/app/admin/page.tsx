"use client";

import { useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import AdminShell from "@/components/AdminShell";
import BookingDetailModal from "@/components/BookingDetailModal";

export const dynamic = "force-dynamic";

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

function todayStr() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

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

export default function AdminDashboardPage() {
  const [date, setDate] = useState(todayStr());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  async function loadBookings(selectedDate: string) {
    setLoading(true);
    setMessage(null);

    try {
      const q = query(collection(db, "bookings"), where("date", "==", selectedDate));
      const snap = await getDocs(q);

      const list: Booking[] = [];
      snap.forEach((d) => {
        list.push({
          id: d.id,
          ...(d.data() as Omit<Booking, "id">),
        });
      });

      list.sort((a, b) => a.timeSlot.localeCompare(b.timeSlot));
      setBookings(list);
    } catch (err: any) {
      setMessage(err?.message ?? "Failed to load bookings");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBookings(date);
  }, [date]);

  async function updateStatus(id: string, status: string) {
    setMessage(null);

    try {
      await updateDoc(doc(db, "bookings", id), { status });

      try {
        await updateDoc(doc(db, "slotLocks", id), { status });
      } catch {
        // ignore if missing
      }

      await loadBookings(date);
      setSelectedBooking(null);
      setMessage(`Booking updated to ${status} ✅`);
    } catch (err: any) {
      setMessage(err?.message ?? "Failed to update booking");
    }
  }

  async function copyConfirmationMessage(booking: Booking) {
    const text = `Hi ${booking.name}, your ${booking.timeSlot} LuxeBoat ride is confirmed. Please arrive 15 minutes early. Late arrivals after 30 minutes will be cancelled as per policy.`;

    try {
      await navigator.clipboard.writeText(text);
      setMessage("Confirmation message copied ✅");
    } catch {
      setMessage("Could not copy message");
    }
  }

  const summary = useMemo(() => {
    const total = bookings.length;
    const booked = bookings.filter((b) => b.status === "booked").length;
    const confirmed = bookings.filter((b) => b.status === "confirmed").length;
    const completed = bookings.filter((b) => b.status === "completed").length;

    return { total, booked, confirmed, completed };
  }, [bookings]);

  return (
    <AdminShell
      title="Admin Dashboard"
      subtitle="Manage bookings, confirmations, and trip operations from one place."
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-1">
            <StatCard label="Total" value={summary.total} />
            <StatCard label="Booked" value={summary.booked} />
            <StatCard label="Confirmed" value={summary.confirmed} />
            <StatCard label="Completed" value={summary.completed} />
          </div>

          <div className="min-w-[180px]">
            <label htmlFor="date" className="block text-sm font-medium">
              View Date
            </label>
            <input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 w-full rounded-xl border p-3"
            />
          </div>
        </div>

        {message && (
          <div className="rounded-xl bg-gray-100 px-4 py-3 text-sm text-gray-700">
            {message}
          </div>
        )}

        <div className="rounded-2xl border bg-white overflow-hidden">
          {loading ? (
            <div className="p-6 text-gray-500">Loading bookings...</div>
          ) : bookings.length === 0 ? (
            <div className="p-6 text-gray-500">No bookings for this date.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr className="text-left">
                  <th className="py-4 px-4">Time</th>
                  <th className="py-4 px-4">Name</th>
                  <th className="py-4 px-4">Guests</th>
                  <th className="py-4 px-4">Package</th>
                  <th className="py-4 px-4">Paid</th>
                  <th className="py-4 px-4">Status</th>
                  <th className="py-4 px-4">Actions</th>
                </tr>
              </thead>

              <tbody>
                {bookings.map((booking) => {
                  const isPaid =
                    booking.status === "booked" ||
                    booking.status === "confirmed" ||
                    booking.status === "completed";

                  return (
                    <tr key={booking.id} className="border-b">
                      <td className="py-4 px-4 font-medium">{booking.timeSlot}</td>
                      <td className="py-4 px-4">
                        <div className="font-medium">{booking.name}</div>
                        <div className="text-gray-500">{booking.phone}</div>
                      </td>
                      <td className="py-4 px-4">{booking.guests}</td>
                      <td className="py-4 px-4 capitalize">{booking.tier}</td>
                      <td className="py-4 px-4">
                        <div>{isPaid ? "Yes" : "No"}</div>
                        <div className="text-gray-500">
                          {formatMoney(booking.depositAmount)}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span
                          className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${statusBadge(
                            booking.status
                          )}`}
                        >
                          {booking.status}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <button
                          onClick={() => setSelectedBooking(booking)}
                          className="rounded-lg border px-3 py-2"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <BookingDetailModal
        booking={selectedBooking}
        onClose={() => setSelectedBooking(null)}
        onConfirm={(id) => updateStatus(id, "confirmed")}
        onCancel={(id) => updateStatus(id, "cancelled")}
        onReschedule={(id) => updateStatus(id, "booked")}
        onMarkCompleted={(id) => updateStatus(id, "completed")}
        onCopyMessage={copyConfirmationMessage}
      />
    </AdminShell>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border bg-gray-50 p-4">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
    </div>
  );
}