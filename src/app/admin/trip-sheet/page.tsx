"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import AdminShell from "@/components/AdminShell";
import { AdminGuard } from "@/components/AdminGuard";

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
  policies?: {
    lateCancelMinutes?: number;
    noRefund?: boolean;
    weatherHyacinthConfirmation?: boolean;
  };
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

function addOnsLabel(addOns?: Booking["addOns"]) {
  if (!addOns || addOns.length === 0) return "None";
  return addOns.map((a) => a.label).join(", ");
}

export default function TripSheetPage() {
  const [date, setDate] = useState(todayStr());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  async function loadBookings(selectedDate: string) {
    setLoading(true);
    setMessage(null);

    try {
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
      setMessage(err?.message ?? "Failed to load trip sheet");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBookings(date);
  }, [date]);

  const summary = useMemo(() => {
    const totalTrips = bookings.length;
    const totalGuests = bookings.reduce((sum, b) => sum + Number(b.guests || 0), 0);
    const confirmedTrips = bookings.filter((b) =>
      ["booked", "confirmed", "completed"].includes(b.status)
    ).length;
    const completedTrips = bookings.filter((b) => b.status === "completed").length;

    return {
      totalTrips,
      totalGuests,
      confirmedTrips,
      completedTrips,
    };
  }, [bookings]);

  function handlePrint() {
    window.print();
  }

  return (
    <AdminGuard>
      <AdminShell
        title="Trip Sheet"
        subtitle="Printable daily summary of all bookings and trip details."
      >
        <div className="space-y-6">
          <div className="rounded-2xl border bg-white p-4 print:hidden">
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label htmlFor="date" className="block text-sm font-medium">
                  Select Date
                </label>
                <input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="mt-1 w-full rounded-xl border p-3"
                />
              </div>

              <div className="flex items-end">
                <button
                  onClick={() => loadBookings(date)}
                  className="w-full rounded-xl border px-4 py-3"
                >
                  Refresh Sheet
                </button>
              </div>

              <div className="flex items-end">
                <button
                  onClick={handlePrint}
                  className="w-full rounded-xl bg-black px-4 py-3 text-white"
                >
                  Print Sheet
                </button>
              </div>
            </div>
          </div>

          {message && (
            <div className="rounded-xl bg-gray-100 px-4 py-3 text-sm text-gray-700 print:hidden">
              {message}
            </div>
          )}

          <div className="rounded-2xl border bg-white p-6 print:border-0 print:shadow-none print:p-0">
            <div className="border-b pb-4 print:pb-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-2xl font-semibold">LuxeBoat Daily Trip Sheet</h3>
                  <p className="mt-1 text-sm text-gray-600">
                    Date: {date}
                  </p>
                </div>

                <div className="hidden print:block text-right text-xs text-gray-500">
                  Generated from LuxeBoat OS
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-4 print:mt-4">
              <SummaryCard label="Total Trips" value={summary.totalTrips} />
              <SummaryCard label="Total Guests" value={summary.totalGuests} />
              <SummaryCard label="Confirmed / Paid" value={summary.confirmedTrips} />
              <SummaryCard label="Completed" value={summary.completedTrips} />
            </div>

            <div className="mt-6 overflow-x-auto">
              {loading ? (
                <div className="py-8 text-gray-500">Loading trip sheet...</div>
              ) : bookings.length === 0 ? (
                <div className="py-8 text-gray-500">No bookings for this date.</div>
              ) : (
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="px-3 py-3 text-left">Time</th>
                      <th className="px-3 py-3 text-left">Guest</th>
                      <th className="px-3 py-3 text-left">Phone</th>
                      <th className="px-3 py-3 text-left">Guests</th>
                      <th className="px-3 py-3 text-left">Package</th>
                      <th className="px-3 py-3 text-left">Add-Ons</th>
                      <th className="px-3 py-3 text-left">Deposit</th>
                      <th className="px-3 py-3 text-left">Status</th>
                      <th className="px-3 py-3 text-left">Notes</th>
                    </tr>
                  </thead>

                  <tbody>
                    {bookings.map((booking) => (
                      <tr key={booking.id} className="border-b align-top">
                        <td className="px-3 py-4 font-medium">{booking.timeSlot}</td>
                        <td className="px-3 py-4">{booking.name}</td>
                        <td className="px-3 py-4">{booking.phone}</td>
                        <td className="px-3 py-4">{booking.guests}</td>
                        <td className="px-3 py-4 capitalize">{booking.tier}</td>
                        <td className="px-3 py-4">{addOnsLabel(booking.addOns)}</td>
                        <td className="px-3 py-4">{formatMoney(booking.depositAmount)}</td>
                        <td className="px-3 py-4">
                          <span
                            className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${statusBadge(
                              booking.status
                            )}`}
                          >
                            {booking.status}
                          </span>
                        </td>
                        <td className="px-3 py-4 text-gray-600">
                          Arrive 15 min early. Late arrivals after 30 min cancel.
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="mt-6 rounded-2xl border bg-gray-50 p-4 text-sm text-gray-700 print:mt-4">
              <div className="font-medium">Daily Notes</div>
              <ul className="mt-2 space-y-1">
                <li>• Confirm weather and water hyacinth conditions before each trip.</li>
                <li>• Deposit secures booking.</li>
                <li>• No refund policy applies.</li>
                <li>• Customers should arrive 15 minutes early.</li>
              </ul>
            </div>
          </div>
        </div>
      </AdminShell>
    </AdminGuard>
  );
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border bg-gray-50 p-4">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
    </div>
  );
}