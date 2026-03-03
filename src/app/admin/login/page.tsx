// src/app/admin/login/page.tsx
"use client";

import { signInWithEmailAndPassword } from "firebase/auth";
import { useState } from "react";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/admin/settings");
    } catch (error: any) {
      setErr(error?.message ?? "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl bg-white p-6 shadow">
      <h1 className="text-2xl font-semibold">Admin Login</h1>
      <p className="mt-1 text-sm text-gray-600">
        Sign in to manage bookings & settings.
      </p>

      <form onSubmit={onLogin} className="mt-6 space-y-4">
        <div>
          <label className="text-sm font-medium" htmlFor="admin-email">
            Email
          </label>
          <input
            id="admin-email"
            className="mt-1 w-full rounded-xl border p-3"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            autoComplete="email"
            required
          />
        </div>

        <div>
          <label className="text-sm font-medium" htmlFor="admin-password">
            Password
          </label>
          <input
            id="admin-password"
            className="mt-1 w-full rounded-xl border p-3"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            autoComplete="current-password"
            required
          />
        </div>

        {err && <div className="text-sm text-red-600">{err}</div>}

        <button
          disabled={loading}
          className="w-full rounded-xl bg-black p-3 text-white disabled:opacity-60"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
}