import Link from "next/link";

export const dynamic = "force-dynamic";

export default function PaymentSuccessPage({
  searchParams,
}: {
  searchParams: { bookingId?: string };
}) {
  const bookingId = searchParams.bookingId;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow p-6 max-w-md w-full text-center">
        <h1 className="text-2xl font-semibold">Payment Submitted ✅</h1>

        <p className="text-sm text-gray-600 mt-2">
          Thanks! Your deposit payment was submitted successfully.
        </p>

        {bookingId && (
          <p className="mt-3 text-sm">
            Booking reference:{" "}
            <span className="font-semibold">{bookingId}</span>
          </p>
        )}

        <p className="mt-3 text-xs text-gray-500">
          Final confirmation will be sent after payment verification.
        </p>

        <div className="mt-6 flex justify-center gap-3">
          <Link
            href="/book"
            className="bg-black text-white px-4 py-2 rounded-xl"
          >
            Book Another Ride
          </Link>
          <Link href="/" className="border px-4 py-2 rounded-xl">
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}