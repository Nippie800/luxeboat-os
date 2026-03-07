"use client";

export const dynamic = "force-dynamic";

import { useEffect, useId, useState } from "react";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { AdminGuard } from "@/components/AdminGuard";
import AdminShell from "@/components/AdminShell";

type GeneralSettings = {
  rideDurationMinutes: number;
  bufferMinutes: number;
  maxGuests: number;
  tripsPerDay: number;
  depositPercentage: number;
  operatingHours: {
    weekdayStart: string;
    weekdayEnd: string;
    weekendStart: string;
    weekendEnd: string;
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
  }, [ref]);

  const save = async () => {
    setSaving(true);
    setMsg(null);

    try {
      await setDoc(
        ref,
        {
          ...settings,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      setMsg("Settings saved ✅");
    } catch (e: any) {
      setMsg(e?.message ?? "Save failed");
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(null), 2500);
    }
  };

  if (loading) {
    return (
      <AdminGuard>
        <AdminShell
          title="Settings"
          subtitle="Control trip timing, guest limits, operating hours, and deposit policy."
        >
          <div className="rounded-2xl border bg-white p-6 text-gray-500">
            Loading settings...
          </div>
        </AdminShell>
      </AdminGuard>
    );
  }

  return (
    <AdminGuard>
      <AdminShell
        title="Settings"
        subtitle="Control trip timing, guest limits, operating hours, and deposit policy."
      >
        <div className="space-y-6">
          {msg && (
            <div className="rounded-xl bg-gray-100 px-4 py-3 text-sm text-gray-700">
              {msg}
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 rounded-2xl border bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold">General Settings</h2>
              <p className="mt-1 text-sm text-gray-600">
                Configure how bookings and time slots are generated.
              </p>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <NumberField
                  label="Ride Duration (minutes)"
                  name="rideDurationMinutes"
                  value={settings.rideDurationMinutes}
                  min={1}
                  step={1}
                  onChange={(v) =>
                    setSettings((s) => ({ ...s, rideDurationMinutes: v }))
                  }
                />

                <NumberField
                  label="Buffer Time (minutes)"
                  name="bufferMinutes"
                  value={settings.bufferMinutes}
                  min={0}
                  step={1}
                  onChange={(v) =>
                    setSettings((s) => ({ ...s, bufferMinutes: v }))
                  }
                />

                <NumberField
                  label="Max Guests"
                  name="maxGuests"
                  value={settings.maxGuests}
                  min={1}
                  step={1}
                  onChange={(v) =>
                    setSettings((s) => ({ ...s, maxGuests: v }))
                  }
                />

                <NumberField
                  label="Trips per Day"
                  name="tripsPerDay"
                  value={settings.tripsPerDay}
                  min={1}
                  step={1}
                  onChange={(v) =>
                    setSettings((s) => ({ ...s, tripsPerDay: v }))
                  }
                />

                <NumberField
                  label="Deposit Percentage"
                  name="depositPercentage"
                  value={settings.depositPercentage}
                  min={0}
                  max={100}
                  step={1}
                  onChange={(v) =>
                    setSettings((s) => ({ ...s, depositPercentage: v }))
                  }
                />
              </div>
            </div>

            <div className="rounded-2xl border bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold">System Summary</h2>
              <div className="mt-4 space-y-3 text-sm">
                <SummaryRow
                  label="Ride Duration"
                  value={`${settings.rideDurationMinutes} min`}
                />
                <SummaryRow
                  label="Buffer Time"
                  value={`${settings.bufferMinutes} min`}
                />
                <SummaryRow
                  label="Max Guests"
                  value={`${settings.maxGuests}`}
                />
                <SummaryRow
                  label="Trips per Day"
                  value={`${settings.tripsPerDay}`}
                />
                <SummaryRow
                  label="Deposit"
                  value={`${settings.depositPercentage}%`}
                />
              </div>

              <button
                onClick={save}
                disabled={saving}
                className="mt-6 w-full rounded-xl bg-black px-5 py-3 text-white disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save Settings"}
              </button>
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Operating Hours</h2>
            <p className="mt-1 text-sm text-gray-600">
              Set the working hours used to generate available booking slots.
            </p>

            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <div className="rounded-2xl border bg-gray-50 p-4">
                <h3 className="text-sm font-semibold">Weekdays</h3>
                <div className="mt-4 grid gap-4">
                  <TimeField
                    label="Weekday Start"
                    name="weekdayStart"
                    value={settings.operatingHours.weekdayStart}
                    onChange={(v) =>
                      setSettings((s) => ({
                        ...s,
                        operatingHours: {
                          ...s.operatingHours,
                          weekdayStart: v,
                        },
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
                        operatingHours: {
                          ...s.operatingHours,
                          weekdayEnd: v,
                        },
                      }))
                    }
                  />
                </div>
              </div>

              <div className="rounded-2xl border bg-gray-50 p-4">
                <h3 className="text-sm font-semibold">Weekends</h3>
                <div className="mt-4 grid gap-4">
                  <TimeField
                    label="Weekend Start"
                    name="weekendStart"
                    value={settings.operatingHours.weekendStart}
                    onChange={(v) =>
                      setSettings((s) => ({
                        ...s,
                        operatingHours: {
                          ...s.operatingHours,
                          weekendStart: v,
                        },
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
                        operatingHours: {
                          ...s.operatingHours,
                          weekendEnd: v,
                        },
                      }))
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </AdminShell>
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

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between border-b pb-2">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}