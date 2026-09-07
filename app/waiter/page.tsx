"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import StaffGuard from "@/components/StaffGuard";

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

export default function WaiterPage() {
  const [orders, setOrders] = useState<WaiterOrder[]>([]);
  const [servingOrderId, setServingOrderId] =
  useState<number | null>(null);

  useEffect(() => {
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
  const printWindow = window.open(
    "",
    "_blank",
    "width=420,height=700"
  );

  if (!printWindow) {
    alert("Please allow popups to print the order.");
    return;
  }

  const guestSections = order.guests
    .map(
      (guest) => `
        <div class="guest">
          <h3>${guest.guestName}</h3>

          ${guest.items
            .map(
              (item) => `
                <div class="item">
                  <span>${item.quantity} × ${item.name}</span>
                </div>
              `
            )
            .join("")}
        </div>
      `
    )
    .join("");

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Table ${order.tableNumber}</title>

        <style>
          @page {
            size: 80mm auto;
            margin: 5mm;
          }

          body {
            font-family: Arial, sans-serif;
            color: #000;
            margin: 0;
            padding: 8px;
            font-size: 13px;
          }

          .receipt {
            width: 72mm;
            margin: auto;
          }

          .brand {
            text-align: center;
            font-size: 24px;
            font-weight: 900;
          }

          .subtitle {
            text-align: center;
            font-size: 10px;
            margin-top: 3px;
          }

          .divider {
            border-top: 1px dashed #000;
            margin: 12px 0;
          }

          .top {
            display: flex;
            justify-content: space-between;
          }

          .table {
            font-size: 28px;
            font-weight: 900;
          }

          .guest {
            margin-top: 14px;
          }

          .guest h3 {
            margin: 0 0 7px;
            padding-bottom: 5px;
            border-bottom: 1px solid #000;
          }

          .item {
            padding: 5px 0;
          }

          .footer {
            margin-top: 18px;
            text-align: center;
            font-weight: 700;
          }
        </style>
      </head>

      <body>
        <div class="receipt">

          <div class="brand">DINEVO</div>

          <div class="subtitle">
            SERVICE ORDER
          </div>

          <div class="divider"></div>

          <div class="top">
            <div>
              <div>TABLE</div>
              <div class="table">
                ${order.tableNumber}
              </div>
            </div>

            <div>
              <div>Order #${order.orderNumber}</div>
              <div>
                ${new Date(order.createdAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>
          </div>

          <div class="divider"></div>

          ${guestSections}

          <div class="divider"></div>

          <div class="footer">
            SERVICE LIST
          </div>

        </div>

        <script>
          window.onload = () => {
            window.print();
          };
        </script>
      </body>
    </html>
  `);

  printWindow.document.close();
};

  return (
    <StaffGuard>
    <main className="min-h-screen bg-[#0d0f10] text-white">
      <header className="border-b border-white/10 px-6 py-5">
        <div className="flex items-center gap-5">
          <h1 className="text-3xl font-black">
            DINE
            <span className="text-red-500">
              VO
            </span>
          </h1>

          <div className="h-8 w-px bg-white/10" />

          <h2 className="text-xl font-bold text-red-500">
            WAITER DISPLAY
          </h2>
        </div>
      </header>

      <section className="p-6">
        {orders.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-[#141719] p-10 text-center">
            <h2 className="text-xl font-bold">
              No service orders
            </h2>

            <p className="mt-2 text-gray-400">
              New table orders will appear here.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-4">
            {orders.map((order) => (
              <div
                key={order.id}
                className="rounded-2xl border border-white/10 bg-[#141719] p-5"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-black">
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
  className={`mt-4 w-full rounded-xl py-3 font-black transition ${
    servingOrderId === order.id
      ? "cursor-not-allowed bg-gray-700 text-gray-400"
      : "bg-green-600 text-white hover:bg-green-700"
  }`}
>
  {servingOrderId === order.id
    ? "MARKING SERVED..."
    : "READY TO SERVE"}
</button>

                <div className="mt-5 space-y-5">
                  {order.guests.map(
                    (guest, guestIndex) => (
                      <div
                        key={`${order.id}-${guestIndex}`}
                        className="border-b border-white/10 pb-4 last:border-b-0"
                      >
                        <p className="font-bold text-red-500">
                          {guest.guestName}
                        </p>

                        <div className="mt-2 space-y-2">
                          {guest.items.map(
                            (item, itemIndex) => (
                              <div
                                key={`${item.name}-${itemIndex}`}
                                className="flex items-center justify-between text-sm"
                              >
                                <span>
                                  {item.name}
                                </span>

                                <span className="font-bold text-red-500">
                                  × {item.quantity}
                                </span>
                              </div>
                            )
                          )}

<button
  onClick={() => printWaiterOrder(order)}
  className="mt-5 w-full rounded-xl border border-red-500 py-3 font-black text-red-500 transition hover:bg-red-500 hover:text-white"
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