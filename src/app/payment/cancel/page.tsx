"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

export const dynamic = "force-dynamic";

export default function PaymentCancelPage() {
  const params = useSearchParams();
  const bookingId = params.get("bookingId");

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow p-6 max-w-md w-full text-center">
        <h1 className="text-2xl font-semibold">Payment Cancelled</h1>
        <p className="text-sm text-gray-600 mt-2">
          You cancelled the payment or it did not complete.
        </p>

        {bookingId && (
          <p className="mt-3 text-sm">
            Booking reference: <span className="font-semibold">{bookingId}</span>
          </p>
        )}

        <div className="mt-6 flex gap-3 justify-center">
          <Link
            href="/book"
            className="bg-black text-white px-4 py-2 rounded-xl"
          >
            Try Again
          </Link>
          <Link
            href="/"
            className="border px-4 py-2 rounded-xl"
          >
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}