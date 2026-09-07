"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function StaffGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/staff-login");
        return;
      }

      setAllowed(true);
    };

    checkSession();
  }, [router]);
const logout = async () => {
  await supabase.auth.signOut();
  router.replace("/staff-login");
};
  if (!allowed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        Checking staff access...
      </div>
    );
  }

  return <>{children}</>;
}