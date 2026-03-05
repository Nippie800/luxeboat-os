import nextDynamic from "next/dynamic";

export const dynamic = "force-dynamic";

const LoginClient = nextDynamic(() => import("./LoginClient"), { ssr: false });

export default function AdminLoginPage() {
  return <LoginClient />;
}