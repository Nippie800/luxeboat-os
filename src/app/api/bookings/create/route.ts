import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const missing: string[] = [];
  if (!body?.name) missing.push("name");
  if (!body?.phone) missing.push("phone");
  if (!body?.date) missing.push("date");
  if (!body?.timeSlot) missing.push("timeSlot");
  if (!body?.guests) missing.push("guests");
  if (!body?.tier) missing.push("tier");

  if (missing.length) {
    return NextResponse.json({ error: "Missing required fields", missing }, { status: 400 });
  }

  const name = String(body.name).trim();
  const phone = String(body.phone).trim();
  const date = String(body.date).trim();
  const timeSlot = String(body.timeSlot).trim();
  const guests = Number(body.guests);
  const tier = String(body.tier).trim();

  const baseAmount = Number(body.baseAmount ?? 0);
  const addOnsTotal = Number(body.addOnsTotal ?? 0);
  const totalAmount = Number(body.totalAmount ?? 0);
  const depositAmount = Number(body.depositAmount ?? 0);

  const bookingId = `${date}_${timeSlot}`;
  const lockRef = adminDb.collection("slotLocks").doc(bookingId);
  const bookingRef = adminDb.collection("bookings").doc(bookingId);

  const holdMinutes = 15;
  const now = Date.now();
  const expiresAtISO = new Date(now + holdMinutes * 60 * 1000).toISOString();

  try {
    await adminDb.runTransaction(async (tx) => {
      const lockSnap = await tx.get(lockRef);

      if (lockSnap.exists) {
        const lock: any = lockSnap.data();

        if (["booked", "confirmed", "completed"].includes(lock?.status)) {
          throw new Error("Slot already taken");
        }

        if (lock?.status === "pending_payment") {
          const exp = lock?.expiresAt ? Date.parse(lock.expiresAt) : 0;
          if (exp && exp > now) throw new Error("Slot already taken");
        }
      }

      tx.set(lockRef, {
        date,
        timeSlot,
        status: "pending_payment",
        expiresAt: expiresAtISO,
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });

      tx.set(bookingRef, {
        name,
        phone,
        date,
        timeSlot,
        guests,
        tier,
        addOns: body.addOns ?? [],
        baseAmount,
        addOnsTotal,
        totalAmount,
        depositAmount,
        status: "pending_payment",
        expiresAt: expiresAtISO,
        createdAt: FieldValue.serverTimestamp(),
        policies: body.policies ?? {
          lateCancelMinutes: 30,
          noRefund: true,
          weatherHyacinthConfirmation: true,
        },
      }, { merge: true });
    });

    return NextResponse.json({ bookingId, expiresAt: expiresAtISO }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Could not create booking" }, { status: 409 });
  }
}