
"use client";
export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
  addDoc
} from "firebase/firestore";

import { db } from "@/lib/firebase";
import { generateSlots, type GeneralSettings, type BookingLite } from "@/lib/slots";

const DEFAULTS: GeneralSettings = {
  rideDurationMinutes: 45,
  bufferMinutes: 10,
  maxGuests: 6,
  tripsPerDay: 5,
  depositPercentage: 50,
  operatingHours: {
    weekdayStart: "10:00",
    weekdayEnd: "12:00",
    weekendStart: "10:00",
    weekendEnd: "17:00",
  },
};

type PartySize = 2 | 4 | 6;

const PRICE_MAP: Record<PartySize, number> = {
  2: 400,
  4: 700,
  6: 900,
};

export default function BookPage() {

  const [settings, setSettings] = useState<GeneralSettings>(DEFAULTS);

  const [date, setDate] = useState("");
  const [bookings, setBookings] = useState<BookingLite[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(true);

  const [timeSlot, setTimeSlot] = useState("");
  const [partySize, setPartySize] = useState<PartySize>(2);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");

    setDate(`${yyyy}-${mm}-${dd}`);
  }, []);

  useEffect(() => {
    async function loadSettings() {
      const ref = doc(db, "settings", "generalSettings");
      const snap = await getDoc(ref);

      if (snap.exists()) {
        setSettings({ ...DEFAULTS, ...(snap.data() as any) });
      }
    }

    loadSettings();
  }, []);

  useEffect(() => {
    async function loadBookings() {

      if (!date) return;

      setLoadingSlots(true);

      const q = query(collection(db, "bookings"), where("date", "==", date));
      const snap = await getDocs(q);

      const list: BookingLite[] = [];

      snap.forEach((doc) => {
        list.push(doc.data() as any);
      });

      setBookings(list);
      setLoadingSlots(false);
    }

    loadBookings();

  }, [date]);

  const slots = useMemo(() => {
    return generateSlots(date, settings, bookings);
  }, [date, settings, bookings]);

  const totalAmount = PRICE_MAP[partySize];

  const depositAmount = Math.round(
    (totalAmount * settings.depositPercentage) / 100
  );

  const canSubmit =
    date &&
    timeSlot &&
    name.length > 2 &&
    phone.length > 6 &&
    !saving;

  async function createBooking() {

    setSaving(true);
    setMessage(null);

    try {

      const slotAvailable = slots.find(s => s.time === timeSlot)?.available;

      if (!slotAvailable) {
        setMessage("That slot was just taken. Please choose another.");
        setSaving(false);
        return;
      }

      await addDoc(collection(db, "bookings"), {
        name,
        phone,
        date,
        timeSlot,
        guests: partySize,
        package: "bronze",
        totalAmount,
        depositAmount,
        status: "pending_payment",
        createdAt: serverTimestamp(),
      });

      setMessage("Booking created successfully (pending payment)");

      setTimeSlot("");
      setName("");
      setPhone("");

    } catch (err: any) {

      setMessage(err.message || "Booking failed");

    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">

      <div className="max-w-xl mx-auto p-6">

        <div className="bg-white rounded-2xl shadow p-6">

          <h1 className="text-2xl font-semibold">
            Book a Boat Ride
          </h1>

          <p className="text-sm text-gray-600 mt-1">
            Secure your slot with a {settings.depositPercentage}% deposit.
          </p>

          <div className="space-y-5 mt-6">

            {/* DATE */}

            <div>
              <label htmlFor="date" className="block text-sm font-medium">
                Select Date
              </label>

              <input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full mt-1 border rounded-xl p-3"
              />
            </div>

            {/* SLOTS */}

            <div>

              <label className="block text-sm font-medium">
                Available Time Slots
              </label>

              {loadingSlots ? (
                <p className="text-sm text-gray-500 mt-2">
                  Loading slots...
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-2 mt-2">

                  {slots.map((slot) => (

                    <button
                      key={slot.time}
                      disabled={!slot.available}
                      onClick={() => setTimeSlot(slot.time)}
                      className={`rounded-xl border p-2 text-sm 
                      ${timeSlot === slot.time ? "border-black" : "border-gray-200"}
                      ${slot.available ? "bg-white" : "bg-gray-100 text-gray-400"}`}
                    >
                      {slot.time}
                    </button>

                  ))}

                </div>
              )}

            </div>

            {/* PARTY SIZE */}

            <div>

              <label htmlFor="partySize" className="block text-sm font-medium">
                Party Size
              </label>

              <select
                id="partySize"
                value={partySize}
                onChange={(e) => setPartySize(Number(e.target.value) as PartySize)}
                className="w-full mt-1 border rounded-xl p-3"
              >
                <option value={2}>2 Guests</option>
                <option value={4}>4 Guests</option>
                <option value={6}>6 Guests</option>
              </select>

            </div>

            {/* NAME + PHONE */}

            <div className="grid grid-cols-2 gap-4">

              <div>
                <label htmlFor="name" className="block text-sm font-medium">
                  Name
                </label>

                <input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full mt-1 border rounded-xl p-3"
                  placeholder="Your name"
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium">
                  Phone
                </label>

                <input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full mt-1 border rounded-xl p-3"
                  placeholder="0712345678"
                />
              </div>

            </div>

            {/* PRICE */}

            <div className="border rounded-xl p-4 bg-gray-50 text-sm">

              <div className="flex justify-between">
                <span>Total</span>
                <span className="font-semibold">R {totalAmount}</span>
              </div>

              <div className="flex justify-between mt-2">
                <span>Deposit ({settings.depositPercentage}%)</span>
                <span className="font-semibold">R {depositAmount}</span>
              </div>

            </div>

            {/* BUTTON */}

            <button
              onClick={createBooking}
              disabled={!canSubmit}
              className="w-full bg-black text-white p-3 rounded-xl disabled:opacity-50"
            >
              {saving ? "Saving..." : "Proceed to Payment (Coming Soon)"}
            </button>

            {message && (
              <p className="text-sm text-gray-700">{message}</p>
            )}

          </div>

        </div>

      </div>

    </div>
  );
}