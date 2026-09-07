"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function ServicePage() {
  const router = useRouter();

const [language, setLanguage] = useState("en");

useEffect(() => {
  const savedLanguage =
    localStorage.getItem("dinevo-language") || "en";

  setLanguage(savedLanguage);
}, []);

const t = {
  en: {
    title: "How would you like to order?",
    subtitle: "Choose your preferred dining option to continue.",
    dineIn: "Dine In",
    dineInDescription:
      "Enjoy your meal here and order directly from your table.",
    selectDineIn: "Select Dine In →",
    takeaway: "Take Away",
    takeawayDescription:
      "Order your food to take away.",
    selectTakeaway: "Select Take Away →",
  },

  fr: {
    title: "Comment souhaitez-vous commander ?",
    subtitle:
      "Choisissez votre option de restauration pour continuer.",
    dineIn: "Sur place",
    dineInDescription:
      "Profitez de votre repas ici et commandez directement depuis votre table.",
    selectDineIn: "Choisir sur place →",
    takeaway: "À emporter",
    takeawayDescription:
      "Commandez votre repas à emporter.",
    selectTakeaway: "Choisir à emporter →",
  },

  es: {
    title: "¿Cómo le gustaría pedir?",
    subtitle:
      "Elija su opción preferida para continuar.",
    dineIn: "Comer aquí",
    dineInDescription:
      "Disfrute de su comida aquí y pida directamente desde su mesa.",
    selectDineIn: "Elegir comer aquí →",
    takeaway: "Para llevar",
    takeawayDescription:
      "Pida su comida para llevar.",
    selectTakeaway: "Elegir para llevar →",
  },

  de: {
    title: "Wie möchten Sie bestellen?",
    subtitle:
      "Wählen Sie Ihre bevorzugte Option, um fortzufahren.",
    dineIn: "Vor Ort",
    dineInDescription:
      "Genießen Sie Ihre Mahlzeit hier und bestellen Sie direkt von Ihrem Tisch.",
    selectDineIn: "Vor Ort wählen →",
    takeaway: "Zum Mitnehmen",
    takeawayDescription:
      "Bestellen Sie Ihr Essen zum Mitnehmen.",
    selectTakeaway: "Zum Mitnehmen wählen →",
  },

  it: {
    title: "Come desideri ordinare?",
    subtitle:
      "Scegli l'opzione che preferisci per continuare.",
    dineIn: "Mangia qui",
    dineInDescription:
      "Goditi il pasto qui e ordina direttamente dal tuo tavolo.",
    selectDineIn: "Scegli Mangia qui →",
    takeaway: "Da asporto",
    takeawayDescription:
      "Ordina il tuo cibo da asporto.",
    selectTakeaway: "Scegli Da asporto →",
  },

  ar: {
    title: "كيف ترغب في الطلب؟",
    subtitle:
      "اختر طريقة تناول الطعام المفضلة لديك للمتابعة.",
    dineIn: "تناول الطعام هنا",
    dineInDescription:
      "استمتع بوجبتك هنا واطلب مباشرة من طاولتك.",
    selectDineIn: "اختر تناول الطعام هنا ←",
    takeaway: "طلب سفري",
    takeawayDescription:
      "اطلب طعامك لأخذه معك.",
    selectTakeaway: "اختر طلب سفري ←",
  },
};

const text =
  t[language as keyof typeof t] || t.en;



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
            {text.title}
          </h1>

          <p className="mx-auto mt-3 max-w-lg text-gray-400">
            {text.subtitle}
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
                {text.dineIn}
              </h2>

              <p className="mt-3 text-gray-400">
               {text.dineInDescription}
              </p>

              <p className="mt-7 font-semibold text-red-500">
               {text.selectDineIn}
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
              {text.takeaway}
              </h2>

              <p className="mt-3 text-gray-400">
               {text.takeawayDescription}
              </p>

              <p className="mt-7 font-semibold text-red-500">
               {text.selectTakeaway}
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