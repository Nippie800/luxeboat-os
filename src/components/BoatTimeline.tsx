"use client";

type Booking = {
  id: string;
  timeSlot: string;
  name: string;
  status: string;
};

const ALL_SLOTS = [
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
];

function getStatusColor(status?: string) {
  switch (status) {
    case "confirmed":
      return "bg-emerald-500";
    case "booked":
      return "bg-sky-500";
    case "completed":
      return "bg-indigo-500";
    case "cancelled":
      return "bg-rose-400";
    default:
      return "bg-slate-200 text-slate-600";
  }
}

export default function BoatTimeline({
  bookings,
}: {
  bookings: Booking[];
}) {
  return (
    <div className="bg-white border rounded-3xl p-5 shadow-sm">

      <h2 className="text-lg font-semibold mb-4">
        ⛵ Boat Timeline
      </h2>

      <div className="flex flex-col gap-3">

        {ALL_SLOTS.map((slot) => {
          const booking = bookings.find(
            (b) => b.timeSlot === slot
          );

          return (
            <div
              key={slot}
              className="flex items-center gap-4"
            >
              <div className="w-16 font-medium text-sm">
                {slot}
              </div>

              <div
                className={`h-9 flex-1 rounded-xl flex items-center px-3 text-white text-sm ${getStatusColor(
                  booking?.status
                )}`}
              >
                {booking
                  ? `${booking.status.toUpperCase()} • ${booking.name}`
                  : "AVAILABLE"}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}