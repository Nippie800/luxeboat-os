import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, runTransaction, serverTimestamp } from "firebase/firestore";

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
  if (typeof body?.depositAmount !== "number") missing.push("depositAmount");
  if (typeof body?.totalAmount !== "number") missing.push("totalAmount");

  if (missing.length) {
    return NextResponse.json(
      { error: "Missing required fields", missing },
      { status: 400 }
    );
  }

  const name = String(body.name).trim();
  const phone = String(body.phone).trim();
  const date = String(body.date).trim();       // YYYY-MM-DD
  const timeSlot = String(body.timeSlot).trim(); // HH:MM
  const guests = Number(body.guests);
  const tier = String(body.tier).trim();

  const baseAmount = Number(body.baseAmount ?? 0);
  const addOnsTotal = Number(body.addOnsTotal ?? 0);
  const totalAmount = Number(body.totalAmount);
  const depositAmount = Number(body.depositAmount);

  // One unique lock per slot
  const bookingId = `${date}_${timeSlot}`;
  const lockRef = doc(db, "slotLocks", bookingId);
  const bookingRef = doc(db, "bookings", bookingId);

  const holdMinutes = 15;
  const now = Date.now();
  const expiresAtISO = new Date(now + holdMinutes * 60 * 1000).toISOString();

  try {
    await runTransaction(db, async (tx) => {
      const lockSnap = await tx.get(lockRef);

      if (lockSnap.exists()) {
        const lock = lockSnap.data() as any;

        if (["booked", "confirmed", "completed"].includes(lock.status)) {
          throw new Error("Slot already taken");
        }

        if (lock.status === "pending_payment") {
          const exp = lock.expiresAt ? Date.parse(lock.expiresAt) : 0;
          if (exp && exp > now) throw new Error("Slot already taken");
        }
      }

      // Lock slot
      tx.set(
        lockRef,
        {
          date,
          timeSlot,
          status: "pending_payment",
          expiresAt: expiresAtISO,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      // Create booking doc
      tx.set(
        bookingRef,
        {
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
          createdAt: serverTimestamp(),
          policies: body.policies ?? {
            lateCancelMinutes: 30,
            noRefund: true,
            weatherHyacinthConfirmation: true,
          },
        },
        { merge: true }
      );
    });

    return NextResponse.json(
      { bookingId, expiresAt: expiresAtISO },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Could not create booking" },
      { status: 409 }
    );
  }
}