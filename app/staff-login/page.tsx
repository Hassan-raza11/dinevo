"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function StaffLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const login = async () => {
    if (!email.trim() || !password) {
      setErrorMessage("Please enter email and password.");
      return;
    }

    if (loading) return;

    setLoading(true);
    setErrorMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
  console.error("Staff login error:", error);

  setErrorMessage(error.message);

  setLoading(false);
  return;
}

    router.push("/admin");
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
            Email
          </label>

          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="staff@restaurant.com"
            className="mt-2 w-full rounded-xl border border-white/10 bg-[#202326] px-4 py-3 outline-none focus:border-red-500"
          />

        </div>

        <div className="mt-5">

          <label className="text-sm font-bold text-gray-400">
            Password
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
            placeholder="Password"
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
          disabled={loading}
          className="mt-7 w-full rounded-xl bg-red-600 py-4 font-black text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-gray-700"
        >
          {loading ? "SIGNING IN..." : "SIGN IN"}
        </button>

        <p className="mt-6 text-center text-xs text-gray-600">
          Authorized restaurant staff only
        </p>

      </div>

    </main>
  );
}