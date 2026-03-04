export const dynamic = "force-dynamic";

import Link from "next/link";

export default async function PaymentSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ bookingId?: string }>;
}) {
  const { bookingId } = await searchParams;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow p-8 max-w-md w-full text-center">
        <h1 className="text-2xl font-semibold">Payment Submitted ✅</h1>
        <p className="mt-2 text-sm text-gray-600">
          Thanks! Your payment is being confirmed. You’ll receive a confirmation message a few hours before your booking (weather + hyacinth check).
        </p>

        {bookingId && (
          <div className="mt-4 text-xs text-gray-500">
            Ref: <span className="font-mono">{bookingId}</span>
          </div>
        )}

        <Link
          href="/"
          className="inline-block mt-6 bg-black text-white px-5 py-3 rounded-xl"
        >
          Back Home
        </Link>
      </div>
    </div>
  );
}