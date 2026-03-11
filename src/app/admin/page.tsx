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
import RescheduleModal from "@/components/RescheduleModal";
import { logBookingEvent } from "@/lib/bookingEvents";
import { runAutoCancelSweepForDate } from "@/lib/bookingAutomation";
import BoatTimeline from "@/components/BoatTimeline";

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
};

type StatusFilter =
  | "all"
  | "pending_payment"
  | "booked"
  | "confirmed"
  | "cancelled"
  | "completed";

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function formatMoney(amount: number) {
  return `R ${Number(amount || 0).toLocaleString("en-ZA")}`;
}

function statusBadge(status: string) {
  switch (status) {
    case "confirmed":
      return "bg-emerald-100 text-emerald-700";
    case "booked":
      return "bg-sky-100 text-sky-700";
    case "completed":
      return "bg-indigo-100 text-indigo-700";
    case "cancelled":
      return "bg-rose-100 text-rose-700";
    case "pending_payment":
      return "bg-amber-100 text-amber-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

export default function AdminDashboardPage() {
  const [date, setDate] = useState(todayStr());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [rescheduleBooking, setRescheduleBooking] = useState<Booking | null>(
    null
  );

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  async function loadBookings(selectedDate: string) {
    setLoading(true);

    try {
      await runAutoCancelSweepForDate(selectedDate);

      const q = query(
        collection(db, "bookings"),
        where("date", "==", selectedDate)
      );

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
      setMessage(err?.message ?? "Failed loading bookings");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBookings(date);
  }, [date]);

  async function updateStatus(id: string, status: string) {
    try {
      await updateDoc(doc(db, "bookings", id), { status });

      await logBookingEvent({
        bookingId: id,
        type: status as any,
        message: `Booking updated to ${status}`,
      });

      await loadBookings(date);

      setMessage(`Booking updated to ${status} ✅`);
    } catch (err: any) {
      setMessage(err?.message ?? "Update failed");
    }
  }

  function openWhatsApp(booking: Booking) {
    const msg = encodeURIComponent(
      `Hi ${booking.name}, your ${booking.timeSlot} LuxeBoat ride is confirmed. Please arrive 15 minutes early.`
    );

    window.open(`https://wa.me/${booking.phone}?text=${msg}`);
  }

  const filteredBookings = useMemo(() => {
    const term = searchTerm.toLowerCase();

    return bookings.filter((b) => {
      const statusMatch =
        statusFilter === "all" ? true : b.status === statusFilter;

      const searchMatch =
        term.length === 0
          ? true
          : b.name.toLowerCase().includes(term) ||
            b.phone.toLowerCase().includes(term);

      return statusMatch && searchMatch;
    });
  }, [bookings, searchTerm, statusFilter]);

  const analytics = useMemo(() => {
    const total = filteredBookings.length;

    const confirmed = filteredBookings.filter(
      (b) => b.status === "confirmed"
    ).length;

    const completed = filteredBookings.filter(
      (b) => b.status === "completed"
    ).length;

    const cancelled = filteredBookings.filter(
      (b) => b.status === "cancelled"
    ).length;

    const revenue = filteredBookings
      .filter((b) => b.status !== "cancelled")
      .reduce((sum, b) => sum + b.depositAmount, 0);

    const captainScore =
      total === 0 ? 100 : Math.round(((confirmed + completed) / total) * 100);

    const guestExperience =
      total === 0 ? 100 : Math.round((completed / total) * 100);

    return {
      total,
      revenue,
      captainScore,
      guestExperience,
      cancelled,
    };
  }, [filteredBookings]);

  const smoothSailing =
    analytics.cancelled === 0 && analytics.total > 3 ? true : false;

  return (
    <AdminShell
      title="Captain Dashboard"
      subtitle="Manage bookings and operations"
    >
      <div className="flex flex-col gap-6">

        {/* STATS */}

        <div className="grid lg:grid-cols-4 gap-4">

          <StatCard label="Bookings Today" value={analytics.total} />

          <StatCard
            label="Revenue Today"
            value={formatMoney(analytics.revenue)}
          />

          <StatCard
            label="Captain Score"
            value={`${analytics.captainScore}%`}
          />

          <StatCard
            label="Guest Experience"
            value={`${analytics.guestExperience}%`}
          />
        </div>
        <BoatTimeline bookings={filteredBookings} />

        {smoothSailing && (
          <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl">
            ⛵ Smooth Sailing Badge — No cancellations today
          </div>
        )}

        {/* FILTERS */}

        <div className="bg-white border rounded-3xl p-4 shadow-sm">
          <div className="grid md:grid-cols-3 gap-4">

            <div>
              <label htmlFor="dateFilter" className="text-sm font-medium">
                Select Date
              </label>
              <input
                id="dateFilter"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="border rounded-xl p-3 w-full"
              />
            </div>

            <div>
              <label htmlFor="searchCustomer" className="text-sm font-medium">
                Search Customer
              </label>
              <input
                id="searchCustomer"
                type="text"
                placeholder="Name or phone"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="border rounded-xl p-3 w-full"
              />
            </div>

            <div>
              <label htmlFor="statusFilter" className="text-sm font-medium">
                Status Filter
              </label>
              <select
                id="statusFilter"
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as StatusFilter)
                }
                className="border rounded-xl p-3 w-full"
              >
                <option value="all">All</option>
                <option value="pending_payment">Pending</option>
                <option value="booked">Booked</option>
                <option value="confirmed">Confirmed</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

          </div>
        </div>

        {/* BOOKINGS TABLE */}

        <div className="bg-white border rounded-3xl shadow-sm overflow-hidden">

          {loading ? (
            <div className="p-6">Loading bookings...</div>
          ) : (
            <table className="w-full text-sm">

              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="p-4">Time</th>
                  <th className="p-4">Customer</th>
                  <th className="p-4">Guests</th>
                  <th className="p-4">Deposit</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Actions</th>
                </tr>
              </thead>

              <tbody>

                {filteredBookings.map((booking) => (
                  <tr key={booking.id} className="border-b">

                    <td className="p-4 font-medium">
                      {booking.timeSlot}
                    </td>

                    <td className="p-4">
                      {booking.name}
                      <div className="text-xs text-slate-500">
                        {booking.phone}
                      </div>
                    </td>

                    <td className="p-4">{booking.guests}</td>

                    <td className="p-4">
                      {formatMoney(booking.depositAmount)}
                    </td>

                    <td className="p-4">
                      <span
                        className={`px-3 py-1 text-xs rounded-full ${statusBadge(
                          booking.status
                        )}`}
                      >
                        {booking.status}
                      </span>
                    </td>

                    <td className="p-4 flex gap-2 flex-wrap">

                      <button
                        onClick={() => setSelectedBooking(booking)}
                        className="border px-3 py-1 rounded-lg"
                      >
                        Details
                      </button>

                      {booking.status === "booked" && (
                        <button
                          onClick={() =>
                            updateStatus(booking.id, "confirmed")
                          }
                          className="bg-emerald-500 text-white px-3 py-1 rounded-lg"
                        >
                          Confirm
                        </button>
                      )}

                      {booking.status === "confirmed" && (
                        <button
                          onClick={() =>
                            updateStatus(booking.id, "completed")
                          }
                          className="bg-indigo-500 text-white px-3 py-1 rounded-lg"
                        >
                          Complete
                        </button>
                      )}

                      {booking.status !== "cancelled" &&
                        booking.status !== "completed" && (
                          <button
                            onClick={() =>
                              updateStatus(booking.id, "cancelled")
                            }
                            className="bg-rose-500 text-white px-3 py-1 rounded-lg"
                          >
                            Cancel
                          </button>
                        )}

                      <button
                        onClick={() => openWhatsApp(booking)}
                        className="border px-3 py-1 rounded-lg"
                      >
                        WhatsApp
                      </button>

                    </td>
                  </tr>
                ))}
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
  onMarkCompleted={(id) => updateStatus(id, "completed")}
  onReschedule={(id) => {
    const booking = bookings.find((b) => b.id === id) || null;
    setRescheduleBooking(booking);
  }}
/>

      <RescheduleModal
        booking={rescheduleBooking}
        onClose={() => setRescheduleBooking(null)}
        onDone={() => loadBookings(date)}
      />
    </AdminShell>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="border bg-white rounded-3xl p-4 shadow-sm">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
    </div>
  );
}