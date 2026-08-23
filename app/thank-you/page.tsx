"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";


type OrderData = {
  orderId?: number;
  tableNumber?: string;
  serviceType?: string;
  total?: number;
  createdAt?: string;
};

export default function ThankYouPage() {
    const router = useRouter();
  const [order, setOrder] = useState<OrderData | null>(null);

  useEffect(() => {
  const savedOrder = localStorage.getItem(
    "dinevo-confirmed-order"
  );

  if (savedOrder) {
    setOrder(JSON.parse(savedOrder));
  }

  const timer = setTimeout(() => {
    // Clear previous customer session
    localStorage.removeItem("dinevo-table-number");
    localStorage.removeItem("dinevo-service-type");
    localStorage.removeItem("dinevo-language");
    localStorage.removeItem("dinevo-confirmed-order");

    // Return tablet to welcome screen
    router.push("/start");
  }, 10000);

  return () => clearTimeout(timer);
}, [router]);

  const orderNumber =
    order?.orderId
      ? String(order.orderId).slice(-5)
      : "-----";

  return (
    <main className="min-h-screen bg-[#111214] text-white">

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
            Order Confirmed
          </p>

          <h1 className="mt-3 text-4xl font-black sm:text-5xl">
            Thank You So Much!
          </h1>

          <p className="mx-auto mt-5 max-w-xl text-lg leading-8 text-gray-400">
            Your order has been successfully sent to our kitchen.
            Our team is now preparing your meal.
          </p>

          {/* ORDER INFORMATION */}

          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">

            {/* ORDER NUMBER */}

            <div className="rounded-2xl border border-white/10 bg-[#1d1e20] p-5">

              <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Order
              </p>

              <p className="mt-2 text-xl font-black">
                #{orderNumber}
              </p>

            </div>

            {/* TABLE */}

            <div className="rounded-2xl border border-white/10 bg-[#1d1e20] p-5">

              <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Table
              </p>

              <p className="mt-2 text-xl font-black">
                {order?.tableNumber
                  ? `Table ${order.tableNumber}`
                  : "—"}
              </p>

            </div>

            {/* SERVICE */}

            <div className="rounded-2xl border border-white/10 bg-[#1d1e20] p-5">

              <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Service
              </p>

              <p className="mt-2 text-xl font-black">
                {order?.serviceType === "takeaway"
                  ? "Take Away"
                  : "Dine In"}
              </p>

            </div>

          </div>

          {/* PREPARATION TIME */}

          <section className="mt-8 rounded-3xl border border-red-500/20 bg-red-500/10 p-8">

            <p className="text-sm font-bold uppercase tracking-[0.18em] text-red-400">
              Estimated Preparation Time
            </p>

            <p className="mt-3 text-5xl font-black">
              15
              <span className="ml-2 text-2xl text-gray-400">
                min
              </span>
            </p>

            <p className="mx-auto mt-4 max-w-md leading-7 text-gray-400">
              Please relax and enjoy your time while our kitchen
              prepares your order.
            </p>

          </section>

          {/* PAYMENT MESSAGE */}

          <section className="mt-6 rounded-3xl border border-white/10 bg-[#1d1e20] p-7">

            <div className="mb-4 text-3xl">
              💳
            </div>

            <h2 className="text-xl font-bold">
              Payment After Your Meal
            </h2>

            <p className="mx-auto mt-3 max-w-lg leading-7 text-gray-400">
              After enjoying your meal, please approach the
              <span className="font-bold text-white">
                {" "}cash counter{" "}
              </span>
              to complete your payment.
            </p>

            {order?.total !== undefined && (

              <div className="mx-auto mt-5 flex max-w-sm items-center justify-between rounded-xl bg-black/30 px-5 py-4">

                <span className="text-sm text-gray-400">
                  Order Total
                </span>

                <strong className="text-xl text-red-500">
                  €{order.total.toFixed(2)}
                </strong>

              </div>

            )}

          </section>

          {/* FOOTER */}

          <footer className="mt-10">

            <p className="text-xs font-bold uppercase tracking-[0.25em] text-gray-600">
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