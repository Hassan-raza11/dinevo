"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function StaffLoginPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const login = () => {
    if (password === "Dinevo2026") {
      localStorage.setItem("dinevo-staff-access", "true");
      router.push("/admin");
      return;
    }

    setErrorMessage("Incorrect staff password.");
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0d0f10] p-6 text-white">

      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#151819] p-8 shadow-2xl">

        <div className="text-center">
          <h1 className="text-4xl font-black">
            <span className="text-red-600">D</span>INEVO
          </h1>

          <p className="mt-2 text-sm text-gray-400">
            Staff Access
          </p>
        </div>

        <div className="mt-8">

          <label className="text-sm font-bold text-gray-400">
            Staff Password
          </label>

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                login();
              }
            }}
            placeholder="Enter staff password"
            className="mt-2 w-full rounded-xl border border-white/10 bg-[#202326] px-4 py-3 outline-none focus:border-red-500"
          />

        </div>

        {errorMessage && (
          <div className="mt-5 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
            {errorMessage}
          </div>
        )}

        <button
          onClick={login}
          className="mt-7 w-full rounded-xl bg-red-600 py-4 font-black text-white hover:bg-red-700"
        >
          SIGN IN
        </button>

      </div>

    </main>
  );
}