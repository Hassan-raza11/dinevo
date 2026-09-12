"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

export default function StaffGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const access = localStorage.getItem(
      "dinevo-staff-access"
    );

    if (access === "true") {
      setAllowed(true);
      return;
    }

    // Remember the page the staff member wanted to open
    sessionStorage.setItem(
      "dinevo-staff-destination",
      pathname
    );

    router.replace("/staff-login");
  }, [pathname, router]);

  if (!allowed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        Checking staff access...
      </div>
    );
  }

  return <>{children}</>;
}