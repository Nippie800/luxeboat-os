"use client";

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

type Props = {
  booking: Booking | null;
  onClose: () => void;
  onConfirm: (id: string) => void;
  onCancel: (id: string) => void;
  onMarkCompleted: (id: string) => void;
  onReschedule: (id: string) => void;
  onCopyMessage: (booking: Booking) => void;
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

export default function BookingDetailModal({
  booking,
  onClose,
  onConfirm,
  onCancel,
  onMarkCompleted,
  onReschedule,
  onCopyMessage,
}: Props) {
  if (!booking) return null;

  const isPaid =
    booking.status === "booked" ||
    booking.status === "confirmed" ||
    booking.status === "completed";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
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

        <div className="grid gap-6 p-6 md:grid-cols-2">
          <div className="space-y-4">
            <InfoRow label="Phone" value={booking.phone} />
            <InfoRow label="Guests" value={String(booking.guests)} />
            <InfoRow label="Package" value={booking.tier} />
            <InfoRow label="Paid" value={isPaid ? "Yes" : "No"} />
            <InfoRow
              label="Deposit"
              value={formatMoney(booking.depositAmount)}
            />
            <InfoRow label="Total" value={formatMoney(booking.totalAmount)} />
            {booking.paidAt && <InfoRow label="Paid At" value={booking.paidAt} />}
          </div>

          <div>
            <div className="mb-4">
              <div className="text-sm text-gray-500">Status</div>
              <div className="mt-2">
                <span
                  className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${statusBadge(
                    booking.status
                  )}`}
                >
                  {booking.status}
                </span>
              </div>
            </div>

            <div>
              <div className="text-sm text-gray-500">Add-Ons</div>
              <div className="mt-2 rounded-xl border bg-gray-50 p-4">
                {booking.addOns && booking.addOns.length > 0 ? (
                  <div className="space-y-2">
                    {booking.addOns.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between text-sm"
                      >
                        <span>{item.label}</span>
                        <span className="font-medium">
                          {formatMoney(item.price)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">No add-ons selected</div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 border-t p-6">
          <button
            onClick={() => onConfirm(booking.id)}
            className="rounded-lg border px-4 py-2 text-sm"
          >
            Confirm
          </button>

          <button
            onClick={() => onCancel(booking.id)}
            className="rounded-lg border px-4 py-2 text-sm"
          >
            Cancel
          </button>

          <button
            onClick={() => onReschedule(booking.id)}
            className="rounded-lg border px-4 py-2 text-sm"
          >
            Reschedule
          </button>

          <button
            onClick={() => onMarkCompleted(booking.id)}
            className="rounded-lg border px-4 py-2 text-sm"
          >
            Mark Completed
          </button>

          <button
            onClick={() => onCopyMessage(booking)}
            className="rounded-lg bg-black px-4 py-2 text-sm text-white"
          >
            Copy WhatsApp Message
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