"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function StaffGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const access =
      localStorage.getItem("dinevo-staff-access");

    if (access !== "true") {
      router.replace("/staff-login");
      return;
    }

    setAllowed(true);
  }, [router]);

  if (!allowed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        Checking staff access...
      </div>
    );
  }

  return <>{children}</>;
}