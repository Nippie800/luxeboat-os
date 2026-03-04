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
type PackageTier = "bronze" | "silver" | "gold" | "platinum";

type AddOnId =
  | "drink_alcoholic"
  | "drink_nonalcoholic"
  | "platter"
  | "fruit_kebab";

const BASE_RIDE_PRICE: Record<PartySize, number> = {
  2: 1900,
  4: 3600,
  6: 5200,
};

const ADD_ONS: Record<AddOnId, { label: string; price: number }> = {
  drink_alcoholic: { label: "Alcoholic Drinks", price: 300 },
  drink_nonalcoholic: { label: "Non-Alcoholic Drinks", price: 130 },
  platter: { label: "Platter", price: 400 },
  fruit_kebab: { label: "Fruit Kebab", price: 220 },
};

const GOLD_NONALC_PRICE = 120;

const TIER_RULES: Record<
  PackageTier,
  { title: string; subtitle: string; allowedAddOns: AddOnId[] }
> = {
  bronze: { title: "Bronze", subtitle: "Boat ride only", allowedAddOns: [] },
  silver: {
    title: "Silver",
    subtitle: "Includes drink options",
    allowedAddOns: ["drink_alcoholic", "drink_nonalcoholic"],
  },
  gold: {
    title: "Gold",
    subtitle: "Includes snacks & bubbles + drink options + fruit kebab option",
    allowedAddOns: ["drink_alcoholic", "drink_nonalcoholic", "fruit_kebab"],
  },
  platinum: {
    title: "Platinum",
    subtitle: "Includes platter & bubbles + drink options + platter option",
    allowedAddOns: ["drink_alcoholic", "drink_nonalcoholic", "platter"],
  },
};

function formatMoney(amount: number) {
  return `R ${amount.toLocaleString("en-ZA")}`;
}

export default function BookPage() {
  const [settings, setSettings] = useState<GeneralSettings>(DEFAULTS);

  const [date, setDate] = useState("");
  const [bookings, setBookings] = useState<BookingLite[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(true);

  const [timeSlot, setTimeSlot] = useState("");
  const [partySize, setPartySize] = useState<PartySize>(2);
  const [tier, setTier] = useState<PackageTier>("bronze");
  const [selectedAddOns, setSelectedAddOns] = useState<AddOnId[]>([]);

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
      if (snap.exists()) setSettings({ ...DEFAULTS, ...(snap.data() as any) });
    }
    loadSettings();
  }, []);

  useEffect(() => {
    async function loadBookings() {
      if (!date) return;
      setLoadingSlots(true);
      setTimeSlot("");

      const q = query(collection(db, "bookings"), where("date", "==", date));
      const snap = await getDocs(q);

      const list: BookingLite[] = [];
      snap.forEach((d) => list.push(d.data() as any));

      setBookings(list);
      setLoadingSlots(false);
    }
    loadBookings();
  }, [date]);

  const slots = useMemo(() => {
    if (!date) return [];
    return generateSlots(date, settings, bookings);
  }, [date, settings, bookings]);

  useEffect(() => {
    const allowed = new Set(TIER_RULES[tier].allowedAddOns);
    setSelectedAddOns((prev) => prev.filter((id) => allowed.has(id)));
  }, [tier]);

  const baseAmount = useMemo(() => BASE_RIDE_PRICE[partySize], [partySize]);

  const addOnsTotal = useMemo(() => {
    return selectedAddOns.reduce((sum, id) => {
      if (tier === "gold" && id === "drink_nonalcoholic") return sum + GOLD_NONALC_PRICE;
      return sum + ADD_ONS[id].price;
    }, 0);
  }, [selectedAddOns, tier]);

  const totalAmount = baseAmount + addOnsTotal;

  const depositAmount = useMemo(() => {
    return Math.round((totalAmount * settings.depositPercentage) / 100);
  }, [totalAmount, settings.depositPercentage]);

  function toggleAddOn(id: AddOnId) {
    setSelectedAddOns((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function isAllowedAddOn(id: AddOnId) {
    return TIER_RULES[tier].allowedAddOns.includes(id);
  }

  const canSubmit =
    date &&
    timeSlot &&
    name.trim().length >= 2 &&
    phone.trim().length >= 8 &&
    !saving;

 async function createBookingAndPay() {
  setSaving(true);
  setMessage(null);

  try {
    // 0) Quick client-side check
    const slotAvailable = slots.find((s) => s.time === timeSlot)?.available;
    if (!slotAvailable) {
      setMessage("That slot was just taken. Please choose another.");
      return;
    }

    // 1) Build add-ons
    const addOnsDetailed = selectedAddOns.map((id) => {
      const price =
        tier === "gold" && id === "drink_nonalcoholic"
          ? GOLD_NONALC_PRICE
          : ADD_ONS[id].price;

      return { id, label: ADD_ONS[id].label, price };
    });

    // Helper to safely parse JSON even when API returns HTML/error
    const safeJson = async (res: Response) => {
      try {
        return await res.json();
      } catch {
        return null;
      }
    };

    // 2) Create HOLD booking + slot lock (server-side)
    const createRes = await fetch("/api/bookings/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        phone: phone.trim(),
        date,
        timeSlot,
        guests: partySize,
        tier,
        addOns: addOnsDetailed,
        baseAmount,
        addOnsTotal,
        totalAmount,
        depositAmount,
        policies: {
          lateCancelMinutes: 30,
          noRefund: true,
          weatherHyacinthConfirmation: true,
        },
      }),
    });

    const createJson = await safeJson(createRes);

    if (!createRes.ok) {
      setMessage(createJson?.error ?? `Could not create booking (${createRes.status})`);
      return;
    }

    const bookingId = String(createJson?.bookingId ?? "").trim();
    if (!bookingId) {
      setMessage("Booking created but bookingId is missing. Please try again.");
      return;
    }

    // 3) Initiate PayFast
    // IMPORTANT: send amount as STRING, and make sure it's valid
    const amountStr = String(depositAmount);
    if (!amountStr || Number(amountStr) <= 0) {
      setMessage("Deposit amount is invalid. Please try again.");
      return;
    }

    const pfRes = await fetch("/api/payfast/initiate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bookingId,
        amount: amountStr,
        itemName: `Boat Ride Deposit (${date} ${timeSlot})`,
      }),
    });

    const pfJson = await safeJson(pfRes);

    if (!pfRes.ok) {
      setMessage(pfJson?.error ?? `Could not start payment (${pfRes.status})`);
      return;
    }

    const redirectUrl = String(pfJson?.redirectUrl ?? "").trim();
    if (!redirectUrl) {
      setMessage("Payment link missing. Please try again.");
      return;
    }

    // 4) Redirect to PayFast
    window.location.href = redirectUrl;

  } catch (err: any) {
    setMessage(err?.message ?? "Something went wrong");
  } finally {
    setSaving(false);
  }
}

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-xl mx-auto p-6">
        <div className="bg-white rounded-2xl shadow p-6">
          <h1 className="text-2xl font-semibold">Book a Boat Ride</h1>
          <p className="text-sm text-gray-600 mt-1">
            Secure your slot with a {settings.depositPercentage}% deposit. Please arrive 15 minutes early.
          </p>

          <div className="space-y-5 mt-6">
            <div>
              <label htmlFor="date" className="block text-sm font-medium">Select Date</label>
              <input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full mt-1 border rounded-xl p-3"
              />
            </div>

            <div>
              <label className="block text-sm font-medium">Available Time Slots</label>
              {loadingSlots ? (
                <p className="text-sm text-gray-500 mt-2">Loading slots...</p>
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
              <div className="mt-2 text-xs text-gray-500">
                Late policy: after 30 minutes, booking is cancelled. No refunds.
              </div>
            </div>

            <div>
              <label htmlFor="partySize" className="block text-sm font-medium">Party Size (Bronze Ride Price)</label>
              <select
                id="partySize"
                value={partySize}
                onChange={(e) => setPartySize(Number(e.target.value) as PartySize)}
                className="w-full mt-1 border rounded-xl p-3"
              >
                <option value={2}>2 Guests — {formatMoney(1900)}</option>
                <option value={4}>4 Guests — {formatMoney(3600)}</option>
                <option value={6}>6 Guests — {formatMoney(5200)}</option>
              </select>
            </div>

            <div>
              <label htmlFor="tier" className="block text-sm font-medium">Package</label>
              <select
                id="tier"
                value={tier}
                onChange={(e) => setTier(e.target.value as PackageTier)}
                className="w-full mt-1 border rounded-xl p-3"
              >
                <option value="bronze">Bronze — Boat ride only</option>
                <option value="silver">Silver — Drinks package</option>
                <option value="gold">Gold — Snacks & bubbles</option>
                <option value="platinum">Platinum — Platter & bubbles</option>
              </select>
              <div className="mt-2 text-xs text-gray-500">{TIER_RULES[tier].subtitle}</div>
            </div>

            <div className="border rounded-xl p-4 bg-gray-50">
              <div className="text-sm font-medium">Add-Ons</div>
              <div className="mt-2 space-y-2">
                <AddOnRow
                  checked={selectedAddOns.includes("drink_alcoholic")}
                  allowed={isAllowedAddOn("drink_alcoholic")}
                  label={`${ADD_ONS.drink_alcoholic.label} — ${formatMoney(ADD_ONS.drink_alcoholic.price)}`}
                  onToggle={() => toggleAddOn("drink_alcoholic")}
                />

                <AddOnRow
                  checked={selectedAddOns.includes("drink_nonalcoholic")}
                  allowed={isAllowedAddOn("drink_nonalcoholic")}
                  label={`Non-Alcoholic Drinks — ${formatMoney(tier === "gold" ? GOLD_NONALC_PRICE : ADD_ONS.drink_nonalcoholic.price)}`}
                  onToggle={() => toggleAddOn("drink_nonalcoholic")}
                />

                <AddOnRow
                  checked={selectedAddOns.includes("fruit_kebab")}
                  allowed={isAllowedAddOn("fruit_kebab")}
                  label={`${ADD_ONS.fruit_kebab.label} — ${formatMoney(ADD_ONS.fruit_kebab.price)}`}
                  onToggle={() => toggleAddOn("fruit_kebab")}
                />

                <AddOnRow
                  checked={selectedAddOns.includes("platter")}
                  allowed={isAllowedAddOn("platter")}
                  label={`${ADD_ONS.platter.label} — ${formatMoney(ADD_ONS.platter.price)}`}
                  onToggle={() => toggleAddOn("platter")}
                />

                {tier === "bronze" && (
                  <div className="text-xs text-gray-500 mt-2">
                    Select Silver/Gold/Platinum to add extras.
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium">Name</label>
                <input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full mt-1 border rounded-xl p-3"
                  placeholder="Your name"
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium">Phone</label>
                <input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full mt-1 border rounded-xl p-3"
                  placeholder="0712345678"
                />
              </div>
            </div>

            <div className="border rounded-xl p-4 bg-gray-50 text-sm">
              <div className="flex justify-between">
                <span>Base Ride</span>
                <span className="font-semibold">{formatMoney(baseAmount)}</span>
              </div>
              <div className="flex justify-between mt-2">
                <span>Add-Ons</span>
                <span className="font-semibold">{formatMoney(addOnsTotal)}</span>
              </div>

              <div className="h-px bg-gray-200 my-3" />

              <div className="flex justify-between">
                <span>Total</span>
                <span className="font-semibold">{formatMoney(totalAmount)}</span>
              </div>
              <div className="flex justify-between mt-2">
                <span>Deposit ({settings.depositPercentage}%)</span>
                <span className="font-semibold">{formatMoney(depositAmount)}</span>
              </div>

              <div className="mt-3 text-xs text-gray-600">
                Due to weather + water hyacinth conditions, confirmation will be sent a few hours before your booking.
              </div>
            </div>

            <button
              onClick={createBookingAndPay}
              disabled={!canSubmit}
              className="w-full bg-black text-white p-3 rounded-xl disabled:opacity-50"
            >
              {saving ? "Redirecting to payment..." : "Pay Deposit Now →"}
            </button>

            {message && <p className="text-sm text-gray-700">{message}</p>}
          </div>
        </div>

        <div className="mt-4 text-center text-xs text-gray-500">
          Powered by LuxeBoat OS
        </div>
      </div>
    </div>
  );
}

function AddOnRow({
  checked,
  allowed,
  label,
  onToggle,
}: {
  checked: boolean;
  allowed: boolean;
  label: string;
  onToggle: () => void;
}) {
  return (
    <label className={`flex items-center justify-between rounded-xl border p-3 ${allowed ? "bg-white" : "bg-gray-100 text-gray-400"}`}>
      <div className="flex items-center gap-3">
        <input type="checkbox" checked={checked} disabled={!allowed} onChange={onToggle} />
        <div className="text-sm">{label}</div>
      </div>
      {!allowed && <span className="text-[11px] text-gray-400">Upgrade package</span>}
    </label>
  );
}