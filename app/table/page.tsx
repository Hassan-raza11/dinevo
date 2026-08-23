"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const tables = Array.from({ length: 20 }, (_, index) => index + 1);

export default function TablePage() {
  const router = useRouter();

  const [selectedTable, setSelectedTable] = useState<number | null>(null);

  const continueToMenu = () => {
    if (selectedTable === null) return;

    localStorage.setItem(
      "dinevo-table-number",
      selectedTable.toString()
    );

    router.push("/");
  };

  return (
    <main className="min-h-screen bg-[#111111] text-white">

      <div className="flex min-h-screen items-center justify-center p-6">

        <div className="w-full max-w-4xl text-center">

          {/* LOGO */}

          <div className="mx-auto mb-7 flex h-24 w-24 items-center justify-center rounded-full border border-white/10 bg-white/5">
            <span className="font-bold text-gray-400">
              LOGO
            </span>
          </div>

          {/* TITLE */}

          <h1 className="text-4xl font-bold">
            Select Your Table
          </h1>

          <p className="mx-auto mt-3 max-w-lg text-gray-400">
            Please select your table number to continue with your order.
          </p>

          {/* TABLE GRID */}

          <section className="mt-10 rounded-3xl border border-white/10 bg-[#1b1b1b] p-8">

            <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-5">

              {tables.map((table) => (

                <button
                  key={table}
                  onClick={() => setSelectedTable(table)}
                  className={`rounded-2xl border px-4 py-6 text-xl font-bold transition ${
                    selectedTable === table
                      ? "border-red-500 bg-red-600 text-white"
                      : "border-white/10 bg-[#242424] text-white hover:border-red-500 hover:bg-[#2d2d2d]"
                  }`}
                >

                  <span className="block text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Table
                  </span>

                  <span className="mt-1 block text-2xl">
                    {table}
                  </span>

                </button>

              ))}

            </div>

          </section>

          {/* SELECTED TABLE */}

          {selectedTable !== null && (

            <div className="mt-6">

              <p className="text-sm text-gray-500">
                Selected Table
              </p>

              <p className="mt-1 text-2xl font-bold text-red-500">
                Table {selectedTable}
              </p>

            </div>

          )}

          {/* CONTINUE */}

          <button
            onClick={continueToMenu}
            disabled={selectedTable === null}
            className="mx-auto mt-7 w-full max-w-sm rounded-2xl bg-red-600 py-4 text-lg font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-gray-700 disabled:text-gray-500"
          >
            Continue to Menu
          </button>

          <footer className="mt-10">

            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gray-600">
              Powered by DINEVO
            </p>

          </footer>

        </div>

      </div>

    </main>
  );
}