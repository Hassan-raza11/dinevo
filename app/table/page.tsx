"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function TablePage() {
  const router = useRouter();

  const [tableNumber, setTableNumber] = useState("");
  const [language, setLanguage] = useState("en");

  useEffect(() => {
    const savedLanguage =
      localStorage.getItem("dinevo-language") || "en";

    setLanguage(savedLanguage);
  }, []);

  const t = {
    en: {
      title: "Enter Your Table Number",
      subtitle:
        "Please enter the table number shown on your table.",
      label: "Table Number",
      placeholder: "Enter table number",
      currentTable: "Table Number",
      table: "Table",
      continue: "Continue to Menu",
      emptyError: "Please enter your table number.",
      invalidError: "Please enter a valid table number.",
      poweredBy: "Powered by DINEVO",
    },

    fr: {
      title: "Entrez votre numéro de table",
      subtitle:
        "Veuillez entrer le numéro indiqué sur votre table.",
      label: "Numéro de table",
      placeholder: "Entrez le numéro de table",
      currentTable: "Numéro de table",
      table: "Table",
      continue: "Continuer vers le menu",
      emptyError:
        "Veuillez entrer votre numéro de table.",
      invalidError:
        "Veuillez entrer un numéro de table valide.",
      poweredBy: "Propulsé par DINEVO",
    },

    es: {
      title: "Introduzca su número de mesa",
      subtitle:
        "Introduzca el número indicado en su mesa.",
      label: "Número de mesa",
      placeholder: "Introduzca el número de mesa",
      currentTable: "Número de mesa",
      table: "Mesa",
      continue: "Continuar al menú",
      emptyError:
        "Introduzca su número de mesa.",
      invalidError:
        "Introduzca un número de mesa válido.",
      poweredBy: "Desarrollado por DINEVO",
    },

    de: {
      title: "Geben Sie Ihre Tischnummer ein",
      subtitle:
        "Bitte geben Sie die auf Ihrem Tisch angegebene Nummer ein.",
      label: "Tischnummer",
      placeholder: "Tischnummer eingeben",
      currentTable: "Tischnummer",
      table: "Tisch",
      continue: "Weiter zum Menü",
      emptyError:
        "Bitte geben Sie Ihre Tischnummer ein.",
      invalidError:
        "Bitte geben Sie eine gültige Tischnummer ein.",
      poweredBy: "Bereitgestellt von DINEVO",
    },

    it: {
      title: "Inserisci il numero del tavolo",
      subtitle:
        "Inserisci il numero indicato sul tuo tavolo.",
      label: "Numero del tavolo",
      placeholder: "Inserisci il numero del tavolo",
      currentTable: "Numero del tavolo",
      table: "Tavolo",
      continue: "Continua al menu",
      emptyError:
        "Inserisci il numero del tavolo.",
      invalidError:
        "Inserisci un numero di tavolo valido.",
      poweredBy: "Powered by DINEVO",
    },

    ar: {
      title: "أدخل رقم طاولتك",
      subtitle:
        "يرجى إدخال الرقم الموجود على طاولتك.",
      label: "رقم الطاولة",
      placeholder: "أدخل رقم الطاولة",
      currentTable: "رقم الطاولة",
      table: "الطاولة",
      continue: "المتابعة إلى القائمة",
      emptyError:
        "يرجى إدخال رقم الطاولة.",
      invalidError:
        "يرجى إدخال رقم طاولة صحيح.",
      poweredBy: "بدعم من DINEVO",
    },
  };

  const text =
    t[language as keyof typeof t] || t.en;

  const continueToMenu = () => {
    const cleanTableNumber = tableNumber.trim();

    if (!cleanTableNumber) {
      alert(text.emptyError);
      return;
    }

    const numericTable = Number(cleanTableNumber);

    if (
      !Number.isInteger(numericTable) ||
      numericTable <= 0
    ) {
      alert(text.invalidError);
      return;
    }

    localStorage.setItem(
      "dinevo-table-number",
      cleanTableNumber
    );

    router.push("/");
  };

  return (
    <main
      className="min-h-screen bg-[#111111] text-white"
      dir={language === "ar" ? "rtl" : "ltr"}
    >
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-xl text-center">

          {/* LOGO */}

          <div className="mx-auto mb-7 flex h-24 w-24 items-center justify-center rounded-full border border-white/10 bg-white/5">
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

          {/* TABLE NUMBER INPUT */}

          <section className="mt-10 rounded-3xl border border-white/10 bg-[#1b1b1b] p-8">

            <label
              htmlFor="tableNumber"
              className="mb-3 block text-left text-sm font-semibold text-gray-400"
            >
              {text.label}
            </label>

            <input
              id="tableNumber"
              type="number"
              min="1"
              inputMode="numeric"
              value={tableNumber}
              onChange={(e) =>
                setTableNumber(e.target.value)
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  continueToMenu();
                }
              }}
              placeholder={text.placeholder}
              className="w-full rounded-2xl border border-white/10 bg-[#242424] px-5 py-5 text-center text-3xl font-bold text-white outline-none transition placeholder:text-lg placeholder:font-normal placeholder:text-gray-600 focus:border-red-500"
            />

          </section>

          {/* CURRENT TABLE */}

          {tableNumber && (
            <div className="mt-6">
              <p className="text-sm text-gray-500">
                {text.currentTable}
              </p>

              <p className="mt-1 text-2xl font-bold text-red-500">
                {text.table} {tableNumber}
              </p>
            </div>
          )}

          {/* CONTINUE */}

          <button
            onClick={continueToMenu}
            disabled={!tableNumber.trim()}
            className="mx-auto mt-7 w-full rounded-2xl bg-red-600 py-4 text-lg font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-gray-700 disabled:text-gray-500"
          >
            {text.continue}
          </button>

          <footer className="mt-10">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gray-600">
              {text.poweredBy}
            </p>
          </footer>

        </div>
      </div>
    </main>
  );
}