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

      // keep slot lock in sync
      try {
        await updateDoc(doc(db, "slotLocks", id), { status });
      } catch {
        // ignore if lock doc missing
      }

      await loadBookings(date);
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
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-2xl shadow p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
              <p className="text-sm text-gray-600 mt-1">
                Manage bookings, confirmations, and trip status.
              </p>
            </div>

            <div>
              <label htmlFor="date" className="block text-sm font-medium">
                View Date
              </label>
              <input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1 border rounded-xl p-3"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <StatCard label="Total" value={summary.total} />
            <StatCard label="Booked" value={summary.booked} />
            <StatCard label="Confirmed" value={summary.confirmed} />
            <StatCard label="Completed" value={summary.completed} />
          </div>

          {message && (
            <div className="mt-4 rounded-xl bg-gray-100 px-4 py-3 text-sm text-gray-700">
              {message}
            </div>
          )}

          <div className="mt-6 overflow-x-auto">
            {loading ? (
              <div className="py-8 text-gray-500">Loading bookings...</div>
            ) : bookings.length === 0 ? (
              <div className="py-8 text-gray-500">No bookings for this date.</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-3 pr-4">Time</th>
                    <th className="py-3 pr-4">Name</th>
                    <th className="py-3 pr-4">Guests</th>
                    <th className="py-3 pr-4">Package</th>
                    <th className="py-3 pr-4">Paid</th>
                    <th className="py-3 pr-4">Status</th>
                    <th className="py-3 pr-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((booking) => {
                    const isPaid =
                      booking.status === "booked" ||
                      booking.status === "confirmed" ||
                      booking.status === "completed";

                    return (
                      <tr key={booking.id} className="border-b align-top">
                        <td className="py-4 pr-4 font-medium">{booking.timeSlot}</td>
                        <td className="py-4 pr-4">
                          <div className="font-medium">{booking.name}</div>
                          <div className="text-gray-500">{booking.phone}</div>
                        </td>
                        <td className="py-4 pr-4">{booking.guests}</td>
                        <td className="py-4 pr-4 capitalize">{booking.tier}</td>
                        <td className="py-4 pr-4">
                          <div>{isPaid ? "Yes" : "No"}</div>
                          <div className="text-gray-500">
                            Deposit: {formatMoney(booking.depositAmount)}
                          </div>
                        </td>
                        <td className="py-4 pr-4">
                          <span
                            className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${statusBadge(
                              booking.status
                            )}`}
                          >
                            {booking.status}
                          </span>
                        </td>
                        <td className="py-4 pr-4">
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => updateStatus(booking.id, "confirmed")}
                              className="rounded-lg border px-3 py-2"
                            >
                              Confirm
                            </button>

                            <button
                              onClick={() => updateStatus(booking.id, "cancelled")}
                              className="rounded-lg border px-3 py-2"
                            >
                              Cancel
                            </button>

                            <button
                              onClick={() => updateStatus(booking.id, "booked")}
                              className="rounded-lg border px-3 py-2"
                            >
                              Reschedule
                            </button>

                            <button
                              onClick={() => updateStatus(booking.id, "completed")}
                              className="rounded-lg border px-3 py-2"
                            >
                              Mark Completed
                            </button>

                            <button
                              onClick={() => copyConfirmationMessage(booking)}
                              className="rounded-lg bg-black text-white px-3 py-2"
                            >
                              Copy WhatsApp Message
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
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