"use client";

import { useRouter } from "next/navigation";

export default function ServicePage() {
  const router = useRouter();

  const chooseService = (type: "dine-in" | "takeaway") => {
    localStorage.setItem("dinevo-service-type", type);

    router.push("/table");
  };

  return (
    <main className="min-h-screen bg-[#111111] text-white">
      <div className="flex min-h-screen items-center justify-center p-6">

        <div className="w-full max-w-3xl text-center">

          {/* LOGO */}

          <div className="mx-auto mb-7 flex h-28 w-28 items-center justify-center rounded-full border border-white/10 bg-white/5">
            <span className="font-bold text-gray-400">
              LOGO
            </span>
          </div>

          {/* TITLE */}

          <h1 className="text-4xl font-bold">
            How would you like to order?
          </h1>

          <p className="mx-auto mt-3 max-w-lg text-gray-400">
            Choose your preferred dining option to continue.
          </p>

          {/* OPTIONS */}

          <div className="mt-10 grid gap-5 md:grid-cols-2">

            {/* DINE IN */}

            <button
              onClick={() => chooseService("dine-in")}
              className="group rounded-3xl border border-white/10 bg-[#1f1f1f] p-8 text-left transition hover:border-red-500 hover:bg-[#292929]"
            >

              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-600 text-3xl">
                🍽️
              </div>

              <h2 className="text-2xl font-bold">
                Dine In
              </h2>

              <p className="mt-3 text-gray-400">
                Enjoy your meal here and order directly from your table.
              </p>

              <p className="mt-7 font-semibold text-red-500">
                Select Dine In →
              </p>

            </button>

            {/* TAKE AWAY */}

            <button
              onClick={() => chooseService("takeaway")}
              className="group rounded-3xl border border-white/10 bg-[#1f1f1f] p-8 text-left transition hover:border-red-500 hover:bg-[#292929]"
            >

              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-600 text-3xl">
                🛍️
              </div>

              <h2 className="text-2xl font-bold">
                Take Away
              </h2>

              <p className="mt-3 text-gray-400">
                Place your order for takeaway and collect it when ready.
              </p>

              <p className="mt-7 font-semibold text-red-500">
                Select Take Away →
              </p>

            </button>

          </div>

          {/* FOOTER */}

          <footer className="mt-12">

            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gray-600">
              Powered by DINEVO
            </p>

          </footer>

        </div>

      </div>
    </main>
  );
}