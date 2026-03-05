import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  // ✅ Lazy init (prevents build-time crash)
  const adminDb = getAdminDb();

  const bodyText = await req.text();
  const params = new URLSearchParams(bodyText);

  const payment_status = params.get("payment_status");
  const bookingId = params.get("m_payment_id");

  if (!bookingId) return new NextResponse("Missing m_payment_id", { status: 400 });

  // NOTE: Later we should validate ITN signature too.
  if (payment_status === "COMPLETE") {
    const bookingRef = adminDb.collection("bookings").doc(bookingId);
    const lockRef = adminDb.collection("slotLocks").doc(bookingId);

    await Promise.all([
      bookingRef.set(
        {
          status: "booked",
          paidAt: new Date().toISOString(),
          payfast: Object.fromEntries(params.entries()),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      ),
      lockRef.set(
        {
          status: "booked",
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      ),
    ]);
  }

  return new NextResponse("OK", { status: 200 });
}