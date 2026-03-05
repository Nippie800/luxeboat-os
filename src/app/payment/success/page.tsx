"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

export const dynamic = "force-dynamic";

export default function PaymentSuccessPage() {
  const params = useSearchParams();
  const bookingId = params.get("bookingId");

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow p-6 max-w-md w-full text-center">
        <h1 className="text-2xl font-semibold">Payment Submitted ✅</h1>
        <p className="text-sm text-gray-600 mt-2">
          Thanks! Your deposit payment was submitted successfully.
        </p>

        {bookingId && (
          <p className="mt-3 text-sm">
            Booking reference: <span className="font-semibold">{bookingId}</span>
          </p>
        )}

        <p className="mt-3 text-xs text-gray-500">
          Final confirmation will be sent after payment verification.
        </p>

        <Link
          href="/"
          className="inline-block mt-6 bg-black text-white px-4 py-2 rounded-xl"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}