"use client";

import { usePathname, useRouter } from "next/navigation";

export default function StaffLogout() {
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = () => {
    // Remember which staff page we are leaving
    sessionStorage.setItem(
      "dinevo-staff-destination",
      pathname
    );

    // Remove staff login access
    localStorage.removeItem(
      "dinevo-staff-access"
    );

    // Go to login
    router.replace("/staff-login");
  };

  return (
    <button
      onClick={handleLogout}
      className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-500"
    >
      LOGOUT
    </button>
  );
}