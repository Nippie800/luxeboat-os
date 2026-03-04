export const dynamic = "force-dynamic";

import Link from "next/link";

export default async function PaymentCancelPage({
  searchParams,
}: {
  searchParams: Promise<{ bookingId?: string }>;
}) {
  const { bookingId } = await searchParams;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow p-8 max-w-md w-full text-center">
        <h1 className="text-2xl font-semibold">Payment Cancelled</h1>
        <p className="mt-2 text-sm text-gray-600">
          No stress — your slot will only be held for a short time. If you still want it, please try again.
        </p>

        {bookingId && (
          <div className="mt-4 text-xs text-gray-500">
            Ref: <span className="font-mono">{bookingId}</span>
          </div>
        )}

        <div className="mt-6 flex gap-3 justify-center">
          <Link href="/book" className="bg-black text-white px-5 py-3 rounded-xl">
            Try Again
          </Link>
          <Link href="/" className="px-5 py-3 rounded-xl border">
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}