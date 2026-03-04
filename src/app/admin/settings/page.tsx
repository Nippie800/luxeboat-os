
"use client";
export const dynamic = "force-dynamic";

import { AdminGuard } from "@/components/AdminGuard";
import { db } from "@/lib/firebase";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { useEffect, useId, useState } from "react";

type GeneralSettings = {
  rideDurationMinutes: number;
  bufferMinutes: number;
  maxGuests: number;
  tripsPerDay: number;
  depositPercentage: number;
  operatingHours: {
    weekdayStart: string; // "10:00"
    weekdayEnd: string; // "12:00"
    weekendStart: string; // "10:00"
    weekendEnd: string; // "17:00"
  };
};

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

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<GeneralSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const ref = doc(db, "settings", "generalSettings");

  useEffect(() => {
    (async () => {
      const snap = await getDoc(ref);
      if (snap.exists()) {
        setSettings({ ...DEFAULTS, ...(snap.data() as any) });
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async () => {
    setSaving(true);
    setMsg(null);
    try {
      await setDoc(ref, { ...settings, updatedAt: serverTimestamp() }, { merge: true });
      setMsg("Saved ✅");
    } catch (e: any) {
      setMsg(e?.message ?? "Save failed");
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(null), 2000);
    }
  };

  if (loading) return <div className="p-6">Loading settings...</div>;

  return (
    <AdminGuard>
      <div className="rounded-2xl bg-white p-6 shadow">
        <h1 className="text-2xl font-semibold">General Settings</h1>
        <p className="mt-1 text-sm text-gray-600">
          Control ride duration, buffer time, guest limits, and deposit policy.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <NumberField
            label="Ride Duration (minutes)"
            name="rideDurationMinutes"
            value={settings.rideDurationMinutes}
            min={1}
            step={1}
            onChange={(v) => setSettings((s) => ({ ...s, rideDurationMinutes: v }))}
          />
          <NumberField
            label="Buffer (minutes)"
            name="bufferMinutes"
            value={settings.bufferMinutes}
            min={0}
            step={1}
            onChange={(v) => setSettings((s) => ({ ...s, bufferMinutes: v }))}
          />
          <NumberField
            label="Max Guests"
            name="maxGuests"
            value={settings.maxGuests}
            min={1}
            step={1}
            onChange={(v) => setSettings((s) => ({ ...s, maxGuests: v }))}
          />
          <NumberField
            label="Trips per Day"
            name="tripsPerDay"
            value={settings.tripsPerDay}
            min={1}
            step={1}
            onChange={(v) => setSettings((s) => ({ ...s, tripsPerDay: v }))}
          />
          <NumberField
            label="Deposit %"
            name="depositPercentage"
            value={settings.depositPercentage}
            min={0}
            max={100}
            step={1}
            onChange={(v) => setSettings((s) => ({ ...s, depositPercentage: v }))}
          />
        </div>

        <div className="mt-6">
          <h2 className="text-lg font-semibold">Operating Hours</h2>
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            <TimeField
              label="Weekday Start"
              name="weekdayStart"
              value={settings.operatingHours.weekdayStart}
              onChange={(v) =>
                setSettings((s) => ({
                  ...s,
                  operatingHours: { ...s.operatingHours, weekdayStart: v },
                }))
              }
            />
            <TimeField
              label="Weekday End"
              name="weekdayEnd"
              value={settings.operatingHours.weekdayEnd}
              onChange={(v) =>
                setSettings((s) => ({
                  ...s,
                  operatingHours: { ...s.operatingHours, weekdayEnd: v },
                }))
              }
            />
            <TimeField
              label="Weekend Start"
              name="weekendStart"
              value={settings.operatingHours.weekendStart}
              onChange={(v) =>
                setSettings((s) => ({
                  ...s,
                  operatingHours: { ...s.operatingHours, weekendStart: v },
                }))
              }
            />
            <TimeField
              label="Weekend End"
              name="weekendEnd"
              value={settings.operatingHours.weekendEnd}
              onChange={(v) =>
                setSettings((s) => ({
                  ...s,
                  operatingHours: { ...s.operatingHours, weekendEnd: v },
                }))
              }
            />
          </div>
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="mt-6 rounded-xl bg-black px-5 py-3 text-white disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save Settings"}
        </button>

        {msg && <div className="mt-3 text-sm text-gray-700">{msg}</div>}
      </div>
    </AdminGuard>
  );
}

function NumberField({
  label,
  name,
  value,
  onChange,
  min,
  max,
  step,
}: {
  label: string;
  name: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  const uid = useId();
  const id = `${name}-${uid}`;

  return (
    <div>
      <label className="text-sm font-medium" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        name={name}
        className="mt-1 w-full rounded-xl border p-3"
        type="number"
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(Number(e.target.value))}
        min={min}
        max={max}
        step={step}
        inputMode="numeric"
      />
    </div>
  );
}

function TimeField({
  label,
  name,
  value,
  onChange,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (s: string) => void;
}) {
  const uid = useId();
  const id = `${name}-${uid}`;

  return (
    <div>
      <label className="text-sm font-medium" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        name={name}
        className="mt-1 w-full rounded-xl border p-3"
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}