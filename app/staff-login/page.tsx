"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function StaffLoginPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // Put your own password here
  const STAFF_PASSWORD = "123456";

  const getDestination = () => {
    const destination =
      sessionStorage.getItem(
        "dinevo-staff-destination"
      );

    const allowedDestinations = [
      "/admin",
      "/cashier",
      "/kitchen",
      "/waiter",
    ];

    if (
      destination &&
      allowedDestinations.some(
        (page) =>
          destination === page ||
          destination.startsWith(`${page}/`)
      )
    ) {
      return destination;
    }

    return "/admin";
  };

  useEffect(() => {
    const access = localStorage.getItem(
      "dinevo-staff-access"
    );

    if (access === "true") {
      const destination = getDestination();

      sessionStorage.removeItem(
        "dinevo-staff-destination"
      );

      router.replace(destination);
    }
  }, [router]);

  const handleLogin = (
    e: FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    setError("");

    if (!password.trim()) {
      setError("Please enter the staff password.");
      return;
    }

    if (password !== STAFF_PASSWORD) {
      setError("Incorrect staff password.");
      setPassword("");
      return;
    }

    localStorage.setItem(
      "dinevo-staff-access",
      "true"
    );

    const destination = getDestination();

    sessionStorage.removeItem(
      "dinevo-staff-destination"
    );

    router.replace(destination);
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0b0d0e] px-5 text-white">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#151719] p-8 shadow-2xl sm:p-10">

        <div className="mb-10 text-center">
          <h1 className="text-5xl font-black tracking-[0.08em]">
            <span className="text-red-600">
              D
            </span>
            INEVO
          </h1>

          <p className="mt-4 text-xl text-zinc-300">
            Staff Access
          </p>

          <p className="mt-2 text-sm text-zinc-500">
            Enter the restaurant staff password
          </p>
        </div>

        <form onSubmit={handleLogin}>
          <label
            htmlFor="staff-password"
            className="mb-3 block text-sm font-semibold text-zinc-300"
          >
            Staff Password
          </label>

          <input
            id="staff-password"
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError("");
            }}
            placeholder="Enter staff password"
            autoFocus
            className="w-full rounded-xl border border-white/10 bg-[#222528] px-5 py-4 text-lg text-white outline-none placeholder:text-zinc-500 focus:border-red-500"
          />

          {error && (
            <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="mt-7 w-full rounded-xl bg-red-600 py-4 text-lg font-bold text-white transition hover:bg-red-500"
          >
            SIGN IN
          </button>
        </form>

      </div>
    </main>
  );
}