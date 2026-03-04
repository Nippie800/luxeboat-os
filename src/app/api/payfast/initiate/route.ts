import { NextResponse } from "next/server";
import crypto from "crypto";

export const runtime = "nodejs";

function pfEncode(val: string) {
  return encodeURIComponent(val.trim());
}

function buildSignature(data: Record<string, string>, passphrase?: string) {
  const keys = Object.keys(data).sort();
  const paramString = keys
    .filter((k) => data[k] !== "" && k !== "signature")
    .map((k) => `${k}=${pfEncode(data[k])}`)
    .join("&");

  const withPass = passphrase
    ? `${paramString}&passphrase=${pfEncode(passphrase)}`
    : paramString;

  return crypto.createHash("md5").update(withPass).digest("hex");
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
    return NextResponse.json(
      { error: "Missing bookingId/amount", received: { bookingId, amount: body?.amount } },
      { status: 400 }
    );
  }

  const merchant_id = process.env.PAYFAST_MERCHANT_ID!;
  const merchant_key = process.env.PAYFAST_MERCHANT_KEY!;
  const passphrase = process.env.PAYFAST_PASSPHRASE || "";

  const processUrl =
    process.env.PAYFAST_PROCESS_URL || "https://sandbox.payfast.co.za/eng/process";

  const appUrl = process.env.APP_URL!;

  const return_url = `${appUrl}/payment/success?bookingId=${encodeURIComponent(bookingId)}`;
  const cancel_url = `${appUrl}/payment/cancel?bookingId=${encodeURIComponent(bookingId)}`;
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

  data.signature = buildSignature(data, passphrase);

  const qs = new URLSearchParams(data).toString();
  const redirectUrl = `${processUrl}?${qs}`;

  return NextResponse.json({ redirectUrl }, { status: 200 });
}