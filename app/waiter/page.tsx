"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import StaffGuard from "@/components/StaffGuard";
import StaffLogout from "@/components/StaffLogout";

type WaiterItem = {
  id?: number;
  name: string;
  quantity: number;
  station?: string;
};

type WaiterGuest = {
  guestName: string;
  items: WaiterItem[];
};

type WaiterOrder = {
  id: number;
  tableNumber: string;
  orderNumber: string;
  createdAt: number;
  guests: WaiterGuest[];
  waiterStatus?: "preparing" | "served";
};

type RestaurantSettings = {
  restaurantName: string;
};

const defaultSettings: RestaurantSettings = {
  restaurantName: "Dinevo Restaurant",
};

export default function WaiterPage() {
  const [settings, setSettings] =
    useState<RestaurantSettings>(defaultSettings);

  const [orders, setOrders] = useState<WaiterOrder[]>([]);
  const [servingOrderId, setServingOrderId] =
  useState<number | null>(null);

  useEffect(() => {
  const loadSettings = async () => {
    const { data, error } = await supabase
      .from("restaurant_settings")
      .select("restaurant_name")
      .eq("id", 1)
      .single();

    if (error) {
      console.error("Waiter settings load error:", error);
      return;
    }

    if (data?.restaurant_name) {
      setSettings({
        restaurantName: data.restaurant_name,
      });
    }
  };

  const loadWaiterOrders = async () => {
    const { data, error } = await supabase
      .from("orders")
      .select(`
        id,
        order_number,
        table_number,
        created_at,
        kitchen_status,
        waiter_status,
        payment_status,
        order_guests (
          id,
          guest_name,
          order_items (
            id,
            item_name,
            quantity,
            station
          )
        )
      `)
      .eq("kitchen_status", "completed")
      .neq("payment_status", "paid")
      .neq("waiter_status", "served")
      .order("created_at", {
        ascending: true,
      });

    if (error) {
      console.error(
        "Waiter Supabase load error:",
        error
      );
      return;
    }

    const waiterOrders: WaiterOrder[] = (
      data || []
    ).map((order: any) => ({
      id: order.id,

      tableNumber: order.table_number,

      orderNumber: order.order_number,

      createdAt: order.created_at,

      waiterStatus:
        order.waiter_status || "waiting",

      guests: (order.order_guests || []).map(
        (guest: any) => ({
          guestName: guest.guest_name,

          items: (guest.order_items || []).map(
            (item: any) => ({
              id: item.id,
              name: item.item_name,
              quantity: item.quantity,
              station: item.station,
            })
          ),
        })
      ),
    }));

    setOrders(waiterOrders);
  };

  // Load immediately
  loadSettings();
  loadWaiterOrders();
const refreshInterval = setInterval(() => {
  loadWaiterOrders();
}, 3000);
  // Listen for Kitchen status changes
  const waiterChannel = supabase
    .channel("dinevo-waiter-orders")

    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "orders",
      },
      () => {
        loadWaiterOrders();
      }
    )

    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "order_guests",
      },
      () => {
        loadWaiterOrders();
      }
    )

    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "order_items",
      },
      () => {
        loadWaiterOrders();
      }
    )

    .subscribe();

  return () => {
  clearInterval(refreshInterval);
  supabase.removeChannel(waiterChannel);
};
}, []);

  const updateWaiterStatus = async (orderId: number) => {
  if (servingOrderId === orderId) return;

  setServingOrderId(orderId);
  const currentOrder = orders.find(
    (order) => order.id === orderId
  );

  if (!currentOrder) return;

  // Update Supabase
  const { error } = await supabase
    .from("orders")
    .update({
      waiter_status: "served",
      served_at: new Date().toISOString(),
    })
    .eq("id", orderId);

  if (error) {
    console.error(
      "Waiter status update error:",
      error
    );

    alert("Could not update waiter order");
     setServingOrderId(null);
    return;
  }

  

  // Remove immediately from Waiter screen
  setOrders((current) =>
    current.filter(
      (order) =>
        String(order.id) !== String(orderId)
    )
  );
};

const printWaiterOrder = (order: WaiterOrder) => {
  const escapeHtml = (value: unknown) =>
    String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const printWindow = window.open(
    "",
    "_blank",
    "width=380,height=700"
  );

  if (!printWindow) {
    alert("Please allow popups to print the order.");
    return;
  }

  const guestSections = order.guests
    .map(
      (guest) => `
        <section class="guest">
          <div class="guest-name">
            ${escapeHtml(guest.guestName)}
          </div>

          ${guest.items
            .map(
              (item) => `
                <div class="item">
                  <span class="qty">${item.quantity}×</span>
                  <span class="item-name">${escapeHtml(item.name)}</span>
                </div>
              `
            )
            .join("")}
        </section>
      `
    )
    .join("");

  const printedAt = new Date();

  printWindow.document.open();

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />

        <title>
          Service Order ${escapeHtml(order.orderNumber)}
        </title>

        <style>
          @page {
            size: 58mm auto;
            margin: 0;
          }

          * {
            box-sizing: border-box;
          }

          html,
          body {
            width: 58mm;
            margin: 0;
            padding: 0;
            background: white;
            color: black;
            font-family: Arial, Helvetica, sans-serif;
          }

          body {
            font-size: 10px;
            line-height: 1.3;
          }

          .receipt {
            width: 58mm;
            padding: 3mm;
            overflow: hidden;
          }

          .brand {
            text-align: center;
            font-size: 16px;
            line-height: 1.1;
            font-weight: 900;
            overflow-wrap: anywhere;
          }

          .subtitle {
            margin-top: 2px;
            text-align: center;
            font-size: 9px;
            font-weight: 800;
          }

          .divider {
            margin: 6px 0;
            border-top: 1px dashed black;
          }

          .top {
            display: flex;
            justify-content: space-between;
            gap: 6px;
          }

          .table-label {
            font-size: 8px;
            font-weight: 700;
          }

          .table {
            font-size: 25px;
            line-height: 1;
            font-weight: 900;
          }

          .order-info {
            text-align: right;
            font-size: 9px;
            line-height: 1.4;
            overflow-wrap: anywhere;
          }

          .service-status {
            margin: 6px 0;
            border: 1.5px solid black;
            padding: 4px;
            text-align: center;
            font-size: 10px;
            font-weight: 900;
          }

          .guest {
            margin-top: 8px;
          }

          .guest-name {
            margin-bottom: 3px;
            padding-bottom: 3px;
            border-bottom: 1px solid black;
            font-size: 10px;
            font-weight: 900;
            text-transform: uppercase;
            overflow-wrap: anywhere;
          }

          .item {
            display: flex;
            gap: 5px;
            padding: 3px 0;
            font-size: 11px;
            font-weight: 700;
          }

          .qty {
            flex: 0 0 auto;
            min-width: 20px;
            font-weight: 900;
          }

          .item-name {
            min-width: 0;
            overflow-wrap: anywhere;
            word-break: break-word;
          }

          .print-time {
            margin-top: 7px;
            padding-top: 5px;
            border-top: 1px dotted #777;
            display: flex;
            justify-content: space-between;
            gap: 5px;
            font-size: 8px;
          }

          .footer {
            margin-top: 9px;
            text-align: center;
            font-size: 9px;
            font-weight: 900;
          }

          .powered {
            margin-top: 2px;
            text-align: center;
            font-size: 7px;
          }

          @media print {
            html,
            body,
            .receipt {
              width: 58mm !important;
              min-width: 58mm !important;
              max-width: 58mm !important;
            }
          }
        </style>
      </head>

      <body>
        <div class="receipt">
          <div class="brand">
            ${escapeHtml(settings.restaurantName)}
          </div>

          <div class="subtitle">
            WAITER SERVICE SLIP
          </div>

          <div class="divider"></div>

          <div class="top">
            <div>
              <div class="table-label">TABLE</div>

              <div class="table">
                ${escapeHtml(order.tableNumber)}
              </div>
            </div>

            <div class="order-info">
              <strong>
                Order #${escapeHtml(order.orderNumber)}
              </strong>

              <br />

              ${new Date(order.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          </div>

          <div class="service-status">
            READY TO SERVE
          </div>

          ${guestSections}

          <div class="print-time">
            <span>Printed</span>

            <strong>
              ${printedAt.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </strong>
          </div>

          <div class="footer">
            SERVICE LIST
          </div>

          <div class="powered">
            Powered by DINEVO
          </div>
        </div>

        <script>
          window.addEventListener("load", function () {
            window.focus();

            setTimeout(function () {
              window.print();
            }, 250);
          });

          window.addEventListener(
            "afterprint",
            function () {
              window.close();
            }
          );
        </script>
      </body>
    </html>
  `);

  printWindow.document.close();
};

  return (
    <StaffGuard>
    <main className="min-h-screen overflow-x-hidden bg-[#0d0f10] text-white">
      <header className="border-b border-white/10 px-3 py-4 sm:px-5 sm:py-5 lg:px-6">
        <div className="flex flex-wrap items-center gap-3 sm:gap-5">
          <h1 className="text-2xl font-black sm:text-3xl">
            DINE
            <span className="text-red-500">
              VO
            </span>
          </h1>

          <div className="hidden h-8 w-px bg-white/10 sm:block" />

          <h2 className="text-base font-bold text-red-500 sm:text-xl">
            WAITER DISPLAY
          </h2>

          <div className="ml-auto shrink-0">
            <StaffLogout />
          </div>
        </div>
      </header>

      <section className="p-3 sm:p-5 lg:p-6">
        {orders.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-[#141719] p-6 text-center sm:p-10">
            <h2 className="text-xl font-bold">
              No service orders
            </h2>

            <p className="mt-2 text-gray-400">
              New table orders will appear here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
            {orders.map((order) => (
              <div
                key={order.id}
                className="min-w-0 rounded-2xl border border-white/10 bg-[#141719] p-4 sm:p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-black sm:text-xl">
                      TABLE {order.tableNumber}
                    </h3>

                    <p className="text-sm text-gray-400">
                      Order #{order.orderNumber}
                    </p>
                  </div>
                </div>

                <button
  onClick={() =>
    updateWaiterStatus(order.id)
  }
  disabled={servingOrderId === order.id}
  className={`mt-4 min-h-12 w-full rounded-xl px-3 py-3 text-sm font-black transition sm:text-base ${
    servingOrderId === order.id
      ? "cursor-not-allowed bg-gray-700 text-gray-400"
      : "bg-green-600 text-white hover:bg-green-700"
  }`}
>
  {servingOrderId === order.id
    ? "MARKING SERVED..."
    : "READY TO SERVE"}
</button>

                <div className="mt-4 space-y-4 sm:mt-5 sm:space-y-5">
                  {order.guests.map(
                    (guest, guestIndex) => (
                      <div
                        key={`${order.id}-${guestIndex}`}
                        className="min-w-0 border-b border-white/10 pb-4 last:border-b-0"
                      >
                        <p className="font-bold text-red-500">
                          {guest.guestName}
                        </p>

                        <div className="mt-2 space-y-2">
                          {guest.items.map(
                            (item, itemIndex) => (
                              <div
                                key={`${item.name}-${itemIndex}`}
                                className="flex min-w-0 items-start justify-between gap-3 text-sm"
                              >
                                <span className="min-w-0 break-words">
                                  {item.name}
                                </span>

                                <span className="shrink-0 font-bold text-red-500">
                                  × {item.quantity}
                                </span>
                              </div>
                            )
                          )}

<button
  onClick={() => printWaiterOrder(order)}
  className="mt-5 min-h-12 w-full rounded-xl border border-red-500 px-3 py-3 text-sm font-black text-red-500 transition hover:bg-red-500 hover:text-white sm:text-base"
>
  🖨 PRINT
</button>

                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
    </StaffGuard>
  );
}