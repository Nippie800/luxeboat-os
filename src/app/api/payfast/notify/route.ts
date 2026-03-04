import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, runTransaction, serverTimestamp } from "firebase/firestore";

export async function POST(req: Request) {
  const body = await req.json();

  const {
    name,
    phone,
    date, // "YYYY-MM-DD"
    timeSlot, // "HH:MM"
    guests,
    tier,
    addOns,
    baseAmount,
    addOnsTotal,
    totalAmount,
    depositAmount,
    policies,
  } = body;

  if (!name || !phone || !date || !timeSlot || !guests || !tier) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // One unique lock per slot
  const lockId = `${date}_${timeSlot}`; // e.g. 2026-03-04_10:00

  const holdMinutes = 15;
  const now = Date.now();
  const expiresAtISO = new Date(now + holdMinutes * 60 * 1000).toISOString();

  const lockRef = doc(db, "slotLocks", lockId);
  const bookingRef = doc(db, "bookings", lockId);

  try {
    await runTransaction(db, async (tx) => {
      const lockSnap = await tx.get(lockRef);

      if (lockSnap.exists()) {
        const lock = lockSnap.data() as any;

        // If slot is booked/confirmed/completed -> blocked
        if (["booked", "confirmed", "completed"].includes(lock.status)) {
          throw new Error("Slot already taken");
        }

        // If pending_payment but not expired -> blocked
        if (lock.status === "pending_payment") {
          const exp = lock.expiresAt ? Date.parse(lock.expiresAt) : 0;
          if (exp && exp > now) throw new Error("Slot already taken");
        }
      }

      // Set/refresh slot lock
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

      // Create booking doc (same ID as lock)
      tx.set(
        bookingRef,
        {
          name: String(name).trim(),
          phone: String(phone).trim(),
          date,
          timeSlot,
          guests,
          tier,
          addOns: addOns ?? [],
          baseAmount,
          addOnsTotal,
          totalAmount,
          depositAmount,
          status: "pending_payment",
          expiresAt: expiresAtISO,
          createdAt: serverTimestamp(),
          policies: policies ?? {
            lateCancelMinutes: 30,
            noRefund: true,
            weatherHyacinthConfirmation: true,
          },
        },
        { merge: true }
      );
    });

    return NextResponse.json({ bookingId: lockId, expiresAt: expiresAtISO }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Could not create booking" }, { status: 409 });
  }
}