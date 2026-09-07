"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type OrderData = {
  id?: number;
  orderId?: number;
  tableNumber?: string;
  serviceType?: string;
  total?: number;
  createdAt?: number | string;
};

const translations = {
  en: {
    orderConfirmed: "Order Confirmed",
    thankYou: "Thank You So Much!",
    message:
      "Your order has been successfully sent to our kitchen. Our team is now preparing your meal.",

    order: "Order",
    table: "Table",
    service: "Service",
    takeaway: "Take Away",
    dineIn: "Dine In",

    preparationTime: "Estimated Preparation Time",
    min: "min",
    preparationMessage:
      "Please relax and enjoy your time while our kitchen prepares your order.",

    paymentTitle: "Payment After Your Meal",
    paymentBefore: "After enjoying your meal, please approach the",
    cashCounter: "cash counter",
    paymentAfter: "to complete your payment.",

    orderTotal: "Order Total",
    poweredBy: "Powered by DINEVO",
    tagline: "From Table to Kitchen, Seamlessly.",
  },

  fr: {
    orderConfirmed: "Commande confirmée",
    thankYou: "Merci beaucoup !",
    message:
      "Votre commande a été envoyée avec succès à notre cuisine. Notre équipe prépare maintenant votre repas.",

    order: "Commande",
    table: "Table",
    service: "Service",
    takeaway: "À emporter",
    dineIn: "Sur place",

    preparationTime: "Temps de préparation estimé",
    min: "min",
    preparationMessage:
      "Détendez-vous et profitez de votre temps pendant que notre cuisine prépare votre commande.",

    paymentTitle: "Paiement après votre repas",
    paymentBefore:
      "Après avoir profité de votre repas, veuillez vous rendre à la",
    cashCounter: "caisse",
    paymentAfter: "pour effectuer votre paiement.",

    orderTotal: "Total de la commande",
    poweredBy: "Propulsé par DINEVO",
    tagline: "De la table à la cuisine, en toute simplicité.",
  },

  es: {
    orderConfirmed: "Pedido confirmado",
    thankYou: "¡Muchas gracias!",
    message:
      "Su pedido ha sido enviado correctamente a nuestra cocina. Nuestro equipo está preparando su comida.",

    order: "Pedido",
    table: "Mesa",
    service: "Servicio",
    takeaway: "Para llevar",
    dineIn: "Comer aquí",

    preparationTime: "Tiempo estimado de preparación",
    min: "min",
    preparationMessage:
      "Relájese y disfrute mientras nuestra cocina prepara su pedido.",

    paymentTitle: "Pago después de su comida",
    paymentBefore:
      "Después de disfrutar de su comida, diríjase a la",
    cashCounter: "caja",
    paymentAfter: "para completar el pago.",

    orderTotal: "Total del pedido",
    poweredBy: "Desarrollado por DINEVO",
    tagline: "De la mesa a la cocina, sin complicaciones.",
  },

  de: {
    orderConfirmed: "Bestellung bestätigt",
    thankYou: "Vielen Dank!",
    message:
      "Ihre Bestellung wurde erfolgreich an unsere Küche gesendet. Unser Team bereitet Ihre Mahlzeit jetzt vor.",

    order: "Bestellung",
    table: "Tisch",
    service: "Service",
    takeaway: "Zum Mitnehmen",
    dineIn: "Vor Ort",

    preparationTime: "Geschätzte Zubereitungszeit",
    min: "Min.",
    preparationMessage:
      "Entspannen Sie sich, während unsere Küche Ihre Bestellung vorbereitet.",

    paymentTitle: "Bezahlung nach dem Essen",
    paymentBefore:
      "Nach Ihrem Essen gehen Sie bitte zur",
    cashCounter: "Kasse",
    paymentAfter: "um Ihre Zahlung abzuschließen.",

    orderTotal: "Bestellsumme",
    poweredBy: "Bereitgestellt von DINEVO",
    tagline: "Vom Tisch zur Küche, nahtlos.",
  },

  it: {
    orderConfirmed: "Ordine confermato",
    thankYou: "Grazie mille!",
    message:
      "Il tuo ordine è stato inviato con successo alla nostra cucina. Il nostro team sta preparando il tuo pasto.",

    order: "Ordine",
    table: "Tavolo",
    service: "Servizio",
    takeaway: "Da asporto",
    dineIn: "Mangia qui",

    preparationTime: "Tempo di preparazione stimato",
    min: "min",
    preparationMessage:
      "Rilassati e goditi il momento mentre la nostra cucina prepara il tuo ordine.",

    paymentTitle: "Pagamento dopo il pasto",
    paymentBefore:
      "Dopo aver gustato il pasto, recati alla",
    cashCounter: "cassa",
    paymentAfter: "per completare il pagamento.",

    orderTotal: "Totale ordine",
    poweredBy: "Powered by DINEVO",
    tagline: "Dal tavolo alla cucina, senza interruzioni.",
  },

  ar: {
    orderConfirmed: "تم تأكيد الطلب",
    thankYou: "شكراً جزيلاً!",
    message:
      "تم إرسال طلبك بنجاح إلى المطبخ. يقوم فريقنا الآن بتحضير وجبتك.",

    order: "الطلب",
    table: "الطاولة",
    service: "الخدمة",
    takeaway: "طلب سفري",
    dineIn: "تناول الطعام هنا",

    preparationTime: "الوقت المتوقع للتحضير",
    min: "دقيقة",
    preparationMessage:
      "استرخِ واستمتع بوقتك بينما يقوم المطبخ بتحضير طلبك.",

    paymentTitle: "الدفع بعد تناول الوجبة",
    paymentBefore:
      "بعد الانتهاء من وجبتك، يرجى التوجه إلى",
    cashCounter: "صندوق الدفع",
    paymentAfter: "لإتمام عملية الدفع.",

    orderTotal: "إجمالي الطلب",
    poweredBy: "بدعم من DINEVO",
    tagline: "من الطاولة إلى المطبخ بكل سلاسة.",
  },
};

export default function ThankYouPage() {
  const router = useRouter();

  const [order, setOrder] =
    useState<OrderData | null>(null);

  const [language, setLanguage] =
    useState("en");
const [preparationTime, setPreparationTime] =
  useState(15);

const [currencySymbol, setCurrencySymbol] =
  useState("€");

  useEffect(() => {
    const savedOrder = localStorage.getItem(
      "dinevo-confirmed-order"
    );

    const savedLanguage =
      localStorage.getItem("dinevo-language") || "en";

    setLanguage(savedLanguage);

    if (savedOrder) {
      setOrder(JSON.parse(savedOrder));
    }

    const timer = setTimeout(() => {
      // Clear previous customer session
      localStorage.removeItem(
        "dinevo-table-number"
      );

      localStorage.removeItem(
        "dinevo-service-type"
      );

      localStorage.removeItem(
        "dinevo-language"
      );

      localStorage.removeItem(
        "dinevo-confirmed-order"
      );

      // Return tablet to welcome screen
      router.push("/start");
    }, 10000);

    return () => clearTimeout(timer);
  }, [router]);
useEffect(() => {
  const loadPreparationTime = async () => {
    const { data, error } = await supabase
      .from("restaurant_settings")
.select("preparation_time, currency_symbol")
.eq("id", 1)
.single();

    if (error) {
      console.error(
        "Preparation time load error:",
        error
      );
      return;
    }

    if (data?.preparation_time) {
      setPreparationTime(
        Number(data.preparation_time)
      );
    }
    if (data?.currency_symbol) {
  setCurrencySymbol(data.currency_symbol);
}
  };

  loadPreparationTime();
}, []);


  const text =
    translations[
      language as keyof typeof translations
    ] || translations.en;

  const orderId =
    order?.id || order?.orderId;

  const orderNumber =
    orderId
      ? String(orderId).slice(-5)
      : "-----";

  return (
    <main
      className="min-h-screen bg-[#111214] text-white"
      dir={language === "ar" ? "rtl" : "ltr"}
    >
      <div className="flex min-h-screen items-center justify-center px-6 py-10">

        <div className="w-full max-w-2xl text-center">

          {/* LOGO */}

          <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-full border border-white/10 bg-white/5">

            <span className="text-lg font-black tracking-wide">
              <span className="text-red-600">
                D
              </span>
              INEVO
            </span>

          </div>

          {/* SUCCESS ICON */}

          <div className="mx-auto mb-7 flex h-20 w-20 items-center justify-center rounded-full bg-green-600 text-4xl font-bold shadow-lg">
            ✓
          </div>

          {/* MESSAGE */}

          <p className="text-sm font-bold uppercase tracking-[0.2em] text-red-500">
            {text.orderConfirmed}
          </p>

          <h1 className="mt-3 text-4xl font-black sm:text-5xl">
            {text.thankYou}
          </h1>

          <p className="mx-auto mt-5 max-w-xl text-lg leading-8 text-gray-400">
            {text.message}
          </p>

          {/* ORDER INFORMATION */}

          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">

            {/* ORDER NUMBER */}

            <div className="rounded-2xl border border-white/10 bg-[#1d1e20] p-5">

              <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
                {text.order}
              </p>

              <p className="mt-2 text-xl font-black">
                #{orderNumber}
              </p>

            </div>

            {/* TABLE */}

            <div className="rounded-2xl border border-white/10 bg-[#1d1e20] p-5">

              <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
                {text.table}
              </p>

              <p className="mt-2 text-xl font-black">
                {order?.tableNumber
                  ? `${text.table} ${order.tableNumber}`
                  : "—"}
              </p>

            </div>

            {/* SERVICE */}

            <div className="rounded-2xl border border-white/10 bg-[#1d1e20] p-5">

              <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
                {text.service}
              </p>

              <p className="mt-2 text-xl font-black">
                {order?.serviceType === "takeaway"
                  ? text.takeaway
                  : text.dineIn}
              </p>

            </div>

          </div>

          {/* PREPARATION TIME */}

          <section className="mt-8 rounded-3xl border border-red-500/20 bg-red-500/10 p-8">

            <p className="text-sm font-bold uppercase tracking-[0.18em] text-red-400">
              {text.preparationTime}
            </p>

            <p className="mt-3 text-5xl font-black">
              {preparationTime}
              <span className="ml-2 text-2xl text-gray-400">
                {text.min}
              </span>
            </p>

            <p className="mx-auto mt-4 max-w-md leading-7 text-gray-400">
              {text.preparationMessage}
            </p>

          </section>

          {/* PAYMENT MESSAGE */}

          <section className="mt-6 rounded-3xl border border-white/10 bg-[#1d1e20] p-7">

            <div className="mb-4 text-3xl">
              💳
            </div>

            <h2 className="text-xl font-bold">
              {text.paymentTitle}
            </h2>

            <p className="mx-auto mt-3 max-w-lg leading-7 text-gray-400">
              {text.paymentBefore}{" "}

              <span className="font-bold text-white">
                {text.cashCounter}
              </span>

              {" "}{text.paymentAfter}
            </p>

            {order?.total !== undefined && (

              <div className="mx-auto mt-5 flex max-w-sm items-center justify-between rounded-xl bg-black/30 px-5 py-4">

                <span className="text-sm text-gray-400">
                  {text.orderTotal}
                </span>

                <strong className="text-xl text-red-500">
                 {currencySymbol}{order.total.toFixed(2)}
                </strong>

              </div>

            )}

          </section>

          {/* FOOTER */}

          <footer className="mt-10">

            <p className="text-xs font-bold uppercase tracking-[0.25em] text-gray-600">
              {text.poweredBy}
            </p>

            <p className="mt-2 text-xs text-gray-700">
              {text.tagline}
            </p>

          </footer>

        </div>

      </div>
    </main>
  );
}