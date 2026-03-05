import { NextResponse } from "next/server";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// PayFast encoding rules:
// - spaces => '+'
// - percent encodings => UPPERCASE
function pfEncode(value: string) {
  let encoded = encodeURIComponent(value.trim());
  encoded = encoded.replace(/%20/g, "+");
  encoded = encoded.replace(/%[0-9a-f]{2}/g, (m) => m.toUpperCase());
  return encoded;
}

function buildParamString(data: Record<string, string>) {
  return Object.keys(data)
    .sort()
    .filter((k) => k !== "signature" && data[k] !== "")
    .map((k) => `${k}=${pfEncode(data[k])}`)
    .join("&");
}

export async function POST(req: Request) {
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const bookingId = String(body?.bookingId ?? "").trim();
  const amountNum = Number(body?.amount);
  const itemName = String(body?.itemName ?? "Boat Ride Deposit").trim();

  if (!bookingId || !Number.isFinite(amountNum) || amountNum <= 0) {
    return NextResponse.json({ error: "Missing bookingId/amount" }, { status: 400 });
  }

  const merchant_id = String(process.env.PAYFAST_MERCHANT_ID ?? "").trim();
  const merchant_key = String(process.env.PAYFAST_MERCHANT_KEY ?? "").trim();
  const passphrase = String(process.env.PAYFAST_PASSPHRASE ?? "").trim(); // can be empty

  const processUrl =
    String(process.env.PAYFAST_PROCESS_URL ?? "").trim() ||
    "https://sandbox.payfast.co.za/eng/process";

  const appUrl = String(process.env.APP_URL ?? "").trim();

  if (!merchant_id || !merchant_key || !appUrl) {
    return NextResponse.json(
      { error: "Missing PAYFAST_MERCHANT_ID / PAYFAST_MERCHANT_KEY / APP_URL" },
      { status: 500 }
    );
  }

  // ✅ IMPORTANT: do NOT encode bookingId here (avoid double-encoding)
  const return_url = `${appUrl}/payment/success?bookingId=${bookingId}`;
  const cancel_url = `${appUrl}/payment/cancel?bookingId=${bookingId}`;
  const notify_url = `${appUrl}/api/payfast/notify`;

  const data: Record<string, string> = {
    merchant_id,
    merchant_key,
    return_url,
    cancel_url,
    notify_url,
    m_payment_id: bookingId,
    amount: amountNum.toFixed(2),
    item_name: itemName,
  };

  const paramString = buildParamString(data);

  const sigBase = passphrase
    ? `${paramString}&passphrase=${pfEncode(passphrase)}`
    : paramString;

  const signature = crypto.createHash("md5").update(sigBase).digest("hex");

  const redirectUrl = `${processUrl}?${paramString}&signature=${signature}`;

  return NextResponse.json({ redirectUrl }, { status: 200 });
}