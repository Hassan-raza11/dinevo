"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import StaffGuard from "@/components/StaffGuard";

type RestaurantSettings = {
  restaurantName: string;
  taxRate: number;
  preparationTime: number;
  currency: string;
  currencySymbol: string;
};

type KitchenItem = {
  id: number;
  name: string;
  price?: number;
  quantity: number;
  station: string;
  done: boolean;
};

type GuestOrder = {
  guestName: string;
  items: KitchenItem[];
};

type KitchenOrder = {
  id: number;
  tableNumber: string;
  orderNumber: string;
  createdAt: number;
  guests: GuestOrder[];
};

const defaultSettings: RestaurantSettings = {
  restaurantName: "Dinevo Restaurant",
  taxRate: 10,
  preparationTime: 15,
  currency: "EUR",
  currencySymbol: "€",
};

export default function KitchenPage() {
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [undoMode, setUndoMode] = useState(false);
  const [now, setNow] = useState<number | null>(null);
  const [settings, setSettings] =
    useState<RestaurantSettings>(defaultSettings);
  const [completingOrderId, setCompletingOrderId] =
    useState<number | null>(null);

  const loadSettings = useCallback(async () => {
    const { data, error } = await supabase
      .from("restaurant_settings")
      .select(
        `
        restaurant_name,
        tax_rate,
        preparation_time,
        currency,
        currency_symbol
      `
      )
      .eq("id", 1)
      .single();

    if (error) {
      console.error("Kitchen settings load error:", error);
      return;
    }

    if (!data) return;

    setSettings({
      restaurantName:
        data.restaurant_name || defaultSettings.restaurantName,
      taxRate:
        Number(data.tax_rate) || defaultSettings.taxRate,
      preparationTime:
        Number(data.preparation_time) ||
        defaultSettings.preparationTime,
      currency:
        data.currency || defaultSettings.currency,
      currencySymbol:
        data.currency_symbol || defaultSettings.currencySymbol,
    });
  }, []);

  const loadKitchenOrders = useCallback(async () => {
    const { data, error } = await supabase
      .from("orders")
      .select(
        `
        id,
        order_number,
        table_number,
        created_at,
        kitchen_status,
        order_guests (
          id,
          guest_name,
          order_items (
            id,
            item_name,
            price,
            quantity,
            station,
            done
          )
        )
      `
      )
      .neq("kitchen_status", "completed")
      .order("created_at", {
        ascending: true,
      });

    if (error) {
      console.error("Kitchen Supabase load error:", error);
      return;
    }

    const kitchenOrders: KitchenOrder[] = (data || [])
      .map((order: any) => ({
        id: Number(order.id),
        tableNumber: String(order.table_number ?? ""),
        orderNumber: String(order.order_number ?? ""),
        createdAt: new Date(order.created_at).getTime(),

        guests: (order.order_guests || [])
          .map((guest: any) => ({
            guestName: String(guest.guest_name ?? "Guest"),

            items: (guest.order_items || [])
              .filter(
                (item: any) => item.station === "kitchen"
              )
              .map((item: any) => ({
                id: Number(item.id),
                name: String(item.item_name ?? "Item"),
                price:
                  item.price === null || item.price === undefined
                    ? undefined
                    : Number(item.price),
                quantity: Math.max(
                  1,
                  Number(item.quantity) || 1
                ),
                station: String(item.station ?? "kitchen"),
                done: Boolean(item.done),
              })),
          }))
          .filter(
            (guest: GuestOrder) => guest.items.length > 0
          ),
      }))
      .filter(
        (order: KitchenOrder) =>
          Number.isFinite(order.createdAt) &&
          order.guests.length > 0
      );

    setOrders(kitchenOrders);
  }, []);

  useEffect(() => {
    setNow(Date.now());

    loadSettings();
    loadKitchenOrders();

    // Timer for elapsed order time.
    const timerInterval = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    // Safety refresh in case realtime misses an event.
    const backupRefreshInterval = setInterval(() => {
      loadKitchenOrders();
    }, 5000);

    const kitchenChannel = supabase
      .channel("dinevo-kitchen-live")

      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
        },
        () => {
          loadKitchenOrders();
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
          loadKitchenOrders();
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
          loadKitchenOrders();
        }
      )

      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "restaurant_settings",
        },
        () => {
          loadSettings();
        }
      )

      .subscribe();

    return () => {
      clearInterval(timerInterval);
      clearInterval(backupRefreshInterval);
      supabase.removeChannel(kitchenChannel);
    };
  }, [loadKitchenOrders, loadSettings]);

  const toggleItem = async (
    orderId: number,
    guestIndex: number,
    itemId: number
  ) => {
    const kitchenOrder = orders.find(
      (order) => order.id === orderId
    );

    if (!kitchenOrder) return;

    const item =
      kitchenOrder.guests[guestIndex]?.items.find(
        (dish) => dish.id === itemId
      );

    if (!item) return;

    const newDoneValue = undoMode ? false : true;

    // Immediate UI update.
    setOrders((currentOrders) =>
      currentOrders.map((order) => {
        if (order.id !== orderId) return order;

        return {
          ...order,
          guests: order.guests.map((guest, index) => {
            if (index !== guestIndex) return guest;

            return {
              ...guest,
              items: guest.items.map((dish) =>
                dish.id === itemId
                  ? {
                      ...dish,
                      done: newDoneValue,
                    }
                  : dish
              ),
            };
          }),
        };
      })
    );

    const { error } = await supabase
      .from("order_items")
      .update({
        done: newDoneValue,
      })
      .eq("id", itemId);

    if (error) {
      console.error("Kitchen item update error:", error);

      // Roll back if database update fails.
      setOrders((currentOrders) =>
        currentOrders.map((order) => {
          if (order.id !== orderId) return order;

          return {
            ...order,
            guests: order.guests.map((guest, index) => {
              if (index !== guestIndex) return guest;

              return {
                ...guest,
                items: guest.items.map((dish) =>
                  dish.id === itemId
                    ? {
                        ...dish,
                        done: item.done,
                      }
                    : dish
                ),
              };
            }),
          };
        })
      );

      alert("Could not update dish status.");
    }
  };

  const completeOrder = async (orderId: number) => {
    if (completingOrderId === orderId) return;

    setCompletingOrderId(orderId);

    const { error } = await supabase
      .from("orders")
      .update({
        kitchen_status: "completed",
        kitchen_completed_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    if (error) {
      console.error("Supabase complete order error:", error);
      setCompletingOrderId(null);
      alert("Could not complete order.");
      return;
    }

    // Remove immediately from Kitchen.
    setOrders((currentOrders) =>
      currentOrders.filter(
        (order) =>
          String(order.id) !== String(orderId)
      )
    );

    setCompletingOrderId(null);
  };

  const visibleOrders = useMemo(() => {
    return [...orders].sort(
      (a, b) => a.createdAt - b.createdAt
    );
  }, [orders]);

  return (
    <StaffGuard>
      <main className="min-h-screen bg-[#0d0f10] text-white">
        {/* HEADER */}

        <header className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div>
            <h1 className="text-3xl font-black">
              <span className="text-red-600">
                KITCHEN
              </span>{" "}
              DISPLAY
            </h1>

            <p className="text-sm text-gray-400">
              Live Orders
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-[#1c1f21] px-5 py-3 text-xl font-bold">
              {now
                ? new Date(now).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "--:--"}
            </div>

            <div className="rounded-xl bg-[#1c1f21] px-5 py-3 font-semibold">
              Oldest First
            </div>

            <div className="rounded-xl bg-[#1c1f21] px-5 py-3 font-semibold text-green-500">
              ● Live
            </div>

            <button
              onClick={() =>
                setUndoMode((current) => !current)
              }
              className={`rounded-xl px-5 py-3 font-bold ${
                undoMode
                  ? "bg-yellow-500 text-black"
                  : "bg-[#1c1f21]"
              }`}
            >
              ↶ Undo Mode
            </button>
          </div>
        </header>

        {/* ORDER COUNT */}

        <div className="flex items-center gap-4 border-b border-white/10 px-6 py-3 text-sm text-gray-400">
          <span>
            Orders 1–4 of {visibleOrders.length}
          </span>

          <span>
            Swipe left / right to see more orders
          </span>

          <span className="ml-auto">
            Target: {settings.preparationTime} min
          </span>
        </div>

        {/* NO ORDERS */}

        {visibleOrders.length === 0 && (
          <div className="flex min-h-[70vh] items-center justify-center">
            <div className="text-center">
              <p className="text-3xl font-bold">
                No Kitchen Orders
              </p>

              <p className="mt-3 text-gray-500">
                New confirmed kitchen orders will appear here automatically.
              </p>
            </div>
          </div>
        )}

        {/* ORDER COLUMNS */}

        {visibleOrders.length > 0 && (
          <section className="overflow-x-auto px-5 py-5">
            <div className="flex min-w-max gap-4">
              {visibleOrders.map((order) => {
                const totalItems =
                  order.guests.reduce(
                    (sum, guest) =>
                      sum +
                      guest.items.reduce(
                        (guestTotal, item) =>
                          guestTotal + item.quantity,
                        0
                      ),
                    0
                  );

                const completedItems =
                  order.guests.reduce(
                    (sum, guest) =>
                      sum +
                      guest.items
                        .filter((item) => item.done)
                        .reduce(
                          (guestTotal, item) =>
                            guestTotal + item.quantity,
                          0
                        ),
                    0
                  );

                const elapsedSeconds = Math.max(
                  0,
                  Math.floor(
                    ((now ?? order.createdAt) -
                      order.createdAt) /
                      1000
                  )
                );

                const minutes = Math.floor(
                  elapsedSeconds / 60
                );

                const seconds =
                  elapsedSeconds % 60;

                const allItemsCompleted =
                  totalItems > 0 &&
                  completedItems === totalItems;

                const preparationTime = Math.max(
                  1,
                  Number(settings.preparationTime) ||
                    defaultSettings.preparationTime
                );

                const warningTime = Math.max(
                  1,
                  preparationTime - 5
                );

                const timerColor =
                  minutes >= preparationTime
                    ? "text-red-500"
                    : minutes >= warningTime
                    ? "text-orange-400"
                    : "text-green-500";

                return (
                  <article
                    key={order.id}
                    className="flex h-[730px] w-[360px] flex-col rounded-2xl border border-white/15 bg-[#151819]"
                  >
                    {/* TABLE HEADER */}

                    <div className="border-b border-white/10 p-5">
                      <div className="flex items-start justify-between">
                        <div>
                          <h2 className="text-2xl font-black">
                            TABLE {order.tableNumber}
                          </h2>

                          <p className="mt-1 text-sm text-gray-400">
                            Order #{order.orderNumber}
                          </p>
                        </div>

                        <p
                          className={`text-xl font-black ${timerColor}`}
                        >
                          {String(minutes).padStart(2, "0")}:
                          {String(seconds).padStart(2, "0")}
                        </p>
                      </div>
                    </div>

                    {/* GUESTS */}

                    <div className="flex-1 space-y-3 overflow-y-auto p-3">
                      {order.guests.map(
                        (guest, guestIndex) => (
                          <div
                            key={`${guest.guestName}-${guestIndex}`}
                            className="overflow-hidden rounded-xl"
                          >
                            {/* GUEST NAME */}

                            <div className="bg-red-700 px-4 py-3 font-bold uppercase">
                              {guest.guestName}
                            </div>

                            {/* DISHES */}

                            <div className="divide-y divide-gray-300">
                              {guest.items.map((item) => (
                                <button
                                  key={`${guestIndex}-${item.id}`}
                                  onClick={() =>
                                    toggleItem(
                                      order.id,
                                      guestIndex,
                                      item.id
                                    )
                                  }
                                  className={`flex w-full items-center justify-between px-4 py-3 text-left text-black transition ${
                                    item.done
                                      ? "bg-[#eef5df]"
                                      : "bg-white"
                                  }`}
                                >
                                  <div className="flex items-center gap-3">
                                    <span
                                      className={`flex h-6 w-6 items-center justify-center rounded-full border text-xs ${
                                        item.done
                                          ? "border-green-600 bg-green-600 text-white"
                                          : "border-gray-400"
                                      }`}
                                    >
                                      {item.done ? "✓" : ""}
                                    </span>

                                    <span className="font-semibold">
                                      {item.name}

                                      {item.quantity > 1 && (
                                        <span className="ml-2 text-red-600">
                                          ×{item.quantity}
                                        </span>
                                      )}
                                    </span>
                                  </div>

                                  <span
                                    className={`text-xs font-bold ${
                                      item.done
                                        ? "text-green-700"
                                        : "text-gray-500"
                                    }`}
                                  >
                                    {item.done
                                      ? "DONE"
                                      : "NEW"}
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )
                      )}
                    </div>

                    {/* PROGRESS */}

                    <div className="border-t border-white/10 p-5">
                      <p className="font-bold">
                        <span className="text-green-500">
                          {completedItems}
                        </span>

                        {" / "}

                        {totalItems}

                        <span className="ml-2 text-sm font-normal text-gray-400">
                          Items Done
                        </span>
                      </p>

                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-700">
                        <div
                          className="h-full bg-green-500"
                          style={{
                            width:
                              totalItems === 0
                                ? "0%"
                                : `${
                                    (completedItems /
                                      totalItems) *
                                    100
                                  }%`,
                          }}
                        />
                      </div>

                      {allItemsCompleted && (
                        <button
                          onClick={() =>
                            completeOrder(order.id)
                          }
                          disabled={
                            completingOrderId === order.id
                          }
                          className="mt-4 w-full rounded-xl bg-green-600 py-3 font-black text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {completingOrderId === order.id
                            ? "COMPLETING..."
                            : "✓ COMPLETED"}
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}
      </main>
    </StaffGuard>
  );
}
