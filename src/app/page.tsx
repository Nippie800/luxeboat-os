import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white p-10 rounded-2xl shadow text-center max-w-md w-full">

        <h1 className="text-3xl font-bold">LuxeBoat</h1>

        <p className="mt-3 text-gray-600">
          Book your unforgettable experience on the water.
        </p>

        <Link
          href="/book"
          className="block mt-6 w-full bg-black text-white py-3 rounded-xl hover:opacity-90 transition"
        >
          Book Your Ride
        </Link>

        <Link
          href="/admin/login"
          className="block mt-3 text-sm text-gray-500 hover:text-black"
        >
          Admin Login
        </Link>

      </div>
    </div>
  );
}