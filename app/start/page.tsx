"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const languages = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
  { code: "it", label: "Italiano", flag: "🇮🇹" },
  { code: "ar", label: "العربية", flag: "🇸🇦" },
];

export default function StartPage() {
  const router = useRouter();

  const [selectedLanguage, setSelectedLanguage] = useState("");
  const [restaurantName, setRestaurantName] =
  useState("Dinevo Restaurant");
useEffect(() => {
  const loadRestaurantSettings = async () => {
    const { data, error } = await supabase
      .from("restaurant_settings")
      .select("restaurant_name")
      .eq("id", 1)
      .single();

    if (error) {
      console.error(
        "Restaurant name load error:",
        error
      );
      return;
    }

    if (data?.restaurant_name) {
      setRestaurantName(data.restaurant_name);
    }
  };

  loadRestaurantSettings();
}, []);

  const continueToMenu = () => {
    if (!selectedLanguage) return;

    localStorage.setItem(
      "dinevo-language",
      selectedLanguage
    );

    router.push("/service");
  };

  return (
    <main className="min-h-screen bg-[#111111] text-white">

      <div className="flex min-h-screen items-center justify-center p-6">

        <div className="w-full max-w-xl text-center">

          {/* RESTAURANT LOGO */}

          <div className="mx-auto mb-8 flex h-32 w-32 items-center justify-center rounded-full border border-white/10 bg-white/5 shadow-xl">

            <span className="text-xl font-bold tracking-wider text-gray-400">
              LOGO
            </span>

          </div>

          {/* WELCOME */}

          <h1 className="text-5xl font-bold tracking-tight">
  Welcome
</h1>

<p className="mt-3 text-2xl font-bold text-red-500">
  {restaurantName}
</p>

          <p className="mx-auto mt-4 max-w-md text-lg leading-7 text-gray-400">
            We're delighted to have you with us.
            Sit back, relax and enjoy your dining experience.
          </p>

          {/* DIVIDER */}

          <div className="mx-auto my-9 h-px w-20 bg-red-600" />

          {/* LANGUAGE */}

          <div className="mx-auto max-w-sm text-left">

            <label
              htmlFor="language"
              className="mb-3 block text-sm font-semibold text-gray-400"
            >
              Choose your language
            </label>

            <select
              id="language"
              value={selectedLanguage}
              onChange={(e) => {
  const language = e.target.value;

  setSelectedLanguage(language);

  localStorage.setItem(
    "dinevo-language",
    language
  );
}}
              className="w-full cursor-pointer rounded-2xl border border-white/10 bg-[#1f1f1f] px-5 py-4 text-lg text-white outline-none transition focus:border-red-500"
            >

              <option value="">
                Select language
              </option>

              {languages.map((language) => (
                <option
                  key={language.code}
                  value={language.code}
                >
                  {language.flag} {language.label}
                </option>
              ))}

            </select>

            {/* CONTINUE */}

            <button
              onClick={continueToMenu}
              disabled={!selectedLanguage}
              className="mt-5 w-full rounded-2xl bg-red-600 py-4 text-lg font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-gray-700 disabled:text-gray-500"
            >
              Continue
            </button>

          </div>

          {/* FOOTER */}

          <footer className="mt-12">

            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gray-600">
              Powered by DINEVO
            </p>

            <p className="mt-2 text-xs text-gray-700">
              From Table to Kitchen, Seamlessly.
            </p>

          </footer>

        </div>

      </div>

    </main>
  );
}