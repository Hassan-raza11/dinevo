"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import StaffGuard from "@/components/StaffGuard";

type RestaurantSettings = {
  restaurantName: string;
  taxRate: number;
  preparationTime: number;
  currency: string;
  currencySymbol: string;
};

const defaultSettings: RestaurantSettings = {
  restaurantName: "Dinevo Restaurant",
  taxRate: 10,
  preparationTime: 15,
  currency: "EUR",
  currencySymbol: "€",
};

type PaymentPart = {
  id: number;
  method: "cash" | "card" | "ticket" | "other";
  amount: number;
  ticketCode?: string;
};


type CashierItem = {
  id: number;
  name: string;
  quantity: number;
  price: number;
};

type GuestOrder = {
  guestName: string;
  items: CashierItem[];
};

type CashierOrder = {

  
  id: number;
  orderNumber: string;
  tableNumber: string;
  createdAt: number;
  guests: GuestOrder[];
  total: number;
  paymentStatus?: "unpaid" | "paid";
 
  paymentBreakdown?: PaymentPart[];
  paidAt?: number;
 
};


export default function CashierPage() {

const [settings, setSettings] =
  useState<RestaurantSettings>(defaultSettings);

  const [paymentParts, setPaymentParts] = useState<PaymentPart[]>([]);

const [newPaymentMethod, setNewPaymentMethod] =
  useState<"cash" | "card" | "ticket" | "other">("cash");

const [newPaymentAmount, setNewPaymentAmount] = useState("");

const [ticketCode, setTicketCode] = useState("");

   
    const router = useRouter();
  const [orders, setOrders] = useState<CashierOrder[]>([]);
  const [selectedOrderId, setSelectedOrderId] =
    useState<number | null>(null);

  
  const [search, setSearch] = useState("");
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
  const loadOrders = async () => {
  
// LOAD RESTAURANT SETTINGS FROM SUPABASE
const {
  data: settingsData,
  error: settingsError,
} = await supabase
  .from("restaurant_settings")
  .select(`
    restaurant_name,
    tax_rate,
    preparation_time,
    currency,
    currency_symbol
  `)
  .eq("id", 1)
  .single();

if (settingsError) {
  console.error(
    "Cashier settings load error:",
    settingsError
  );
} else if (settingsData) {
  setSettings({
    restaurantName:
      settingsData.restaurant_name ||
      "Dinevo Restaurant",

    taxRate:
      Number(settingsData.tax_rate) || 10,

    preparationTime:
      Number(settingsData.preparation_time) || 15,

    currency:
      settingsData.currency || "EUR",

    currencySymbol:
      settingsData.currency_symbol || "€",
  });
}
    const { data, error } = await supabase
      .from("orders")
      .select(`
        id,
        order_number,
        table_number,
        created_at,
        total,
        kitchen_status,
        waiter_status,
        payment_status,
        paid_at,
        order_guests (
          id,
          guest_name,
          order_items (
            id,
            item_name,
            price,
            quantity,
            station
          )
        ),
        payments (
          id,
          method,
          amount,
          created_at
        )
      `)
      .order("created_at", {
        ascending: true,
      });

    if (error) {
      console.error(
        "Cashier Supabase load error:",
        error
      );
      return;
    }

    const cashierOrders: CashierOrder[] = (
      data || []
    ).map((order: any) => ({
      id: order.id,

      tableNumber: order.table_number,

      orderNumber: order.order_number,

      createdAt: new Date(
        order.created_at
      ).getTime(),

      total: Number(order.total),

      kitchenStatus: order.kitchen_status,

      waiterStatus: order.waiter_status,

      paymentStatus: order.payment_status,

      paidAt: order.paid_at
        ? new Date(order.paid_at).getTime()
        : undefined,

      guests: (order.order_guests || []).map(
        (guest: any) => ({
          guestName: guest.guest_name,

          items: (guest.order_items || []).map(
            (item: any) => ({
              id: item.id,
              name: item.item_name,
              price: Number(item.price),
              quantity: item.quantity,
              station: item.station,
            })
          ),
        })
      ),

      paymentBreakdown: (order.payments || []).map(
        (payment: any) => ({
          id: payment.id,
          method: payment.method,
          amount: Number(payment.amount),
        })
      ),
    }));

    setOrders(cashierOrders);

    // If nothing is selected, automatically select
    // the first unpaid order.
    setSelectedOrderId((currentId) => {
      if (currentId !== null) {
        const stillExists = cashierOrders.some(
          (order) =>
            order.id === currentId &&
            order.paymentStatus !== "paid"
        );

        if (stillExists) {
          return currentId;
        }
      }

      const firstUnpaid = cashierOrders.find(
        (order) =>
          order.paymentStatus !== "paid"
      );

      return firstUnpaid
        ? firstUnpaid.id
        : null;
    });
  };

  // Initial load
  loadOrders();

  setNow(Date.now());

  // Keep timer moving
  const timerInterval = setInterval(() => {
    setNow(Date.now());
  }, 1000);

  // Listen for order changes
  const cashierChannel = supabase
    .channel("dinevo-cashier-orders")

    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "orders",
      },
      () => {
        loadOrders();
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
        loadOrders();
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
        loadOrders();
      }
    )

    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "payments",
      },
      () => {
        loadOrders();
      }
    )

    .subscribe();

  return () => {
    clearInterval(timerInterval);
    supabase.removeChannel(cashierChannel);
  };
}, []);

  const openOrders = useMemo(() => {
    return orders
      .filter(
        (order) =>
          order.paymentStatus !== "paid"
      )
      .filter((order) => {
        const text =
          `${order.tableNumber} ${order.orderNumber} ${order.guests
            .map((guest) => guest.guestName)
            .join(" ")}`.toLowerCase();

        return text.includes(search.toLowerCase());
      })
      .sort(
        (a, b) =>
          a.createdAt - b.createdAt
      );
  }, [orders, search]);

  const selectedOrder =
    orders.find(
      (order) =>
        order.id === selectedOrderId
    ) || null;

 const todayPaidOrders = useMemo(() => {
  if (!now) return [];

  const today = new Date(now);

  return orders
    .filter(
      (order) =>
        order.paymentStatus === "paid" &&
        order.paidAt
    )
    .filter((order) => {
      const paidDate = new Date(
        order.paidAt as number
      );

      return (
        paidDate.getFullYear() ===
          today.getFullYear() &&
        paidDate.getMonth() ===
          today.getMonth() &&
        paidDate.getDate() ===
          today.getDate()
      );
    })
    .sort(
      (a, b) =>
        (b.paidAt || 0) -
        (a.paidAt || 0)
    );
}, [orders, now]);

const completePayment = async () => {
  if (!selectedOrder) return;
const totalPaid = paymentParts.reduce(
  (sum, part) => sum + part.amount,
  0
);

const remaining = selectedOrder.total - totalPaid;

if (remaining > 0.01) {
  alert(
    `Payment is incomplete. Remaining: ${settings.currencySymbol}${remaining.toFixed(2)}`
  );
  return;
}

  if (paymentParts.length === 0) {
    alert("Please add at least one payment.");
    return;
  }

  

  const difference =
    selectedOrder.total - totalPaid;

  if (Math.abs(difference) > 0.01) {
    alert(
      `Payment is incomplete. Remaining amount: ${settings.currencySymbol}${Math.max(
  0,
  difference
).toFixed(2)}`
    );
    return;
  }

  const paidAt = Date.now();

// SAVE PAYMENT TO SUPABASE
const paymentRows = paymentParts.map((part) => ({
  order_id: selectedOrder.id,
  method: part.method,
  amount: part.amount,
}));

const { error: paymentError } = await supabase
  .from("payments")
  .insert(paymentRows);

if (paymentError) {
  console.error(
    "Supabase payment insert error:",
    paymentError
  );

  alert("Could not save payment");
  return;
}

const { error: orderPaymentError } = await supabase
  .from("orders")
  .update({
    payment_status: "paid",
    paid_at: new Date(paidAt).toISOString(),
  })
  .eq("id", selectedOrder.id);

if (orderPaymentError) {
  console.error(
    "Supabase order payment update error:",
    orderPaymentError
  );

  alert("Could not complete payment");
  return;
}

  

 

 const updatedOrders = orders.map((order) =>
  order.id === selectedOrder.id
    ? {
        ...order,
        paymentStatus: "paid" as const,
        paymentBreakdown: paymentParts,
        paidAt,
      }
    : order
);

setOrders(updatedOrders);

  const nextUnpaid = updatedOrders.find(
    (order: CashierOrder) =>
      order.paymentStatus !== "paid"
  );

  setSelectedOrderId(
    nextUnpaid ? nextUnpaid.id : null
  );

  setPaymentParts([]);
  setNewPaymentAmount("");
  setTicketCode("");
};

const printSelectedOrder = () => {
  if (!selectedOrder) {
    alert("Please select an order first.");
    return;
  }

  const status =
    selectedOrder.paymentStatus === "paid"
      ? "PAID"
      : "UNPAID";

  const guestSections = selectedOrder.guests
    .map((guest) => {
      const guestTotal = guest.items.reduce(
        (sum, item) =>
          sum + item.price * item.quantity,
        0
      );

      const items = guest.items
        .map(
          (item) => `
            <div class="item">
              <span>${item.quantity} × ${item.name}</span>
              <span>${settings.currencySymbol}${(
  item.price * item.quantity
).toFixed(2)}</span>
            </div>
          `
        )
        .join("");

      return `
        <section class="guest">
          <h3>${guest.guestName}</h3>

          ${items}

          <div class="guest-total">
            <span>Guest Total</span>
            <strong>${settings.currencySymbol}${guestTotal.toFixed(2)}</strong>
          </div>
        </section>
      `;
    })
    .join("");
const paidInformation =
  selectedOrder.paymentStatus === "paid"
    ? `
      <div class="payment-section">
        <div class="payment-title">Payment</div>

        ${
          selectedOrder.paymentBreakdown &&
          selectedOrder.paymentBreakdown.length > 0
            ? selectedOrder.paymentBreakdown
                .map(
                  (part) => `
                    <div class="payment-row">
                      <span>
                        ${
                          part.method === "ticket"
                            ? "Ticket Restaurant"
                            : part.method.toUpperCase()
                        }
                      </span>

                      <strong>
                        ${settings.currencySymbol}${part.amount.toFixed(2)}
                      </strong>
                    </div>
                  `
                )
                .join("")
            : `
    <div class="payment-row">
      <span>Payment</span>

      <strong>
        ${settings.currencySymbol}${selectedOrder.total.toFixed(2)}
      </strong>
    </div>
  `
        }

        ${
          selectedOrder.paidAt
            ? `
                <div class="payment-row paid-time">
                  <span>Paid At</span>

                  <strong>
                    ${new Date(
                      selectedOrder.paidAt
                    ).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </strong>
                </div>
              `
            : ""
        }
      </div>
    `
    : "";
  const printWindow = window.open(
    "",
    "_blank",
    "width=420,height=700"
  );

  if (!printWindow) {
    alert("Please allow popups to print the slip.");
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>

    <html>
      <head>

        <title>
          Order #${selectedOrder.orderNumber}
        </title>

        <style>

          @page {
            size: 80mm auto;
            margin: 5mm;
          }

          body {
            font-family: Arial, sans-serif;
            background: white;
            color: black;
            margin: 0;
            padding: 8px;
            font-size: 12px;
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
            border-top: 1px dashed black;
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

          .order-info {
            text-align: right;
            line-height: 1.5;
          }

          .status {
            margin: 12px 0;
            border: 2px solid black;
            padding: 7px;
            text-align: center;
            font-weight: 900;
          }

          .guest {
            margin-top: 14px;
          }

          .guest h3 {
            margin: 0 0 7px;
            padding-bottom: 5px;
            border-bottom: 1px solid black;
            text-transform: uppercase;
          }

          .item {
            display: flex;
            justify-content: space-between;
            gap: 15px;
            padding: 4px 0;
          }

          .guest-total {
            display: flex;
            justify-content: space-between;
            border-top: 1px dotted #777;
            margin-top: 6px;
            padding-top: 6px;
          }

.summary-row {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
}

          .total {
            display: flex;
            justify-content: space-between;
            margin-top: 15px;
            font-size: 20px;
            font-weight: 900;
          }

          .payment {
            border-top: 1px dashed black;
            margin-top: 12px;
            padding-top: 10px;
          }

          .payment div {
            display: flex;
            justify-content: space-between;
            padding: 3px 0;
          }

          .unpaid {
            border: 2px solid black;
            margin-top: 15px;
            padding: 9px;
            text-align: center;
            font-weight: 900;
          }

          .footer {
            text-align: center;
            margin-top: 20px;
          }

          .payment-section {
  margin-top: 14px;
  padding-top: 10px;
  border-top: 1px dashed black;
}

.payment-title {
  font-weight: 700;
  margin-bottom: 10px;
}

.payment-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  margin: 7px 0;
  font-size: 12px;
}

.payment-row span {
  text-align: left;
}

.payment-row strong {
  text-align: right;
}

.paid-time {
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px dashed #777;
}

        </style>

      </head>

      <body>

        <div class="receipt">

          <div class="brand">
  ${settings.restaurantName}
</div>
            DINEVO
          </div>

          <div class="subtitle">
            From Table to Kitchen, Seamlessly.
          </div>

          <div class="divider"></div>

          <div class="top">

            <div>
              <div>TABLE</div>

              <div class="table">
                ${selectedOrder.tableNumber}
              </div>
            </div>

            <div class="order-info">
              <strong>
                Order #${selectedOrder.orderNumber}
              </strong>

              <br />

              ${new Date(
                selectedOrder.createdAt
              ).toLocaleDateString()}

              <br />

              ${new Date(
                selectedOrder.createdAt
              ).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>

          </div>

          <div class="status">
            STATUS: ${status}
          </div>

          ${guestSections}

<div class="divider"></div>

<div class="summary-row">
  <span>Subtotal</span>
  <strong>
    ${settings.currencySymbol}${(
      selectedOrder.total /
      (1 + settings.taxRate / 100)
    ).toFixed(2)}
  </strong>
</div>

<div class="summary-row">
  <span>Tax (${settings.taxRate}%)</span>
  <strong>
    ${settings.currencySymbol}${(
      selectedOrder.total -
      selectedOrder.total /
        (1 + settings.taxRate / 100)
    ).toFixed(2)}
  </strong>
</div>

<div class="divider"></div>

<div class="total">
  <span>TOTAL</span>

  <span>
    ${settings.currencySymbol}${selectedOrder.total.toFixed(2)}
  </span>
</div>

<div class="divider"></div>

${paidInformation}

          <div class="footer">
            <strong>Thank You!</strong>

            <br />

            <small>
              Powered by DINEVO
            </small>
          </div>

        </div>

        <script>
          window.onload = () => {
            window.print();
          };

          window.onafterprint = () => {
            window.close();
          };
        </script>

      </body>
    </html>
  `);

  printWindow.document.close();
};

const paidAmount = paymentParts.reduce(
  (sum, part) => sum + part.amount,
  0
);

const remainingAmount = Math.max(
  0,
  (selectedOrder?.total || 0) - paidAmount
);
const addPaymentPart = () => {
  if (!selectedOrder) return;

  const amount = Number(newPaymentAmount);

  const alreadyPaid = paymentParts.reduce(
  (sum, part) => sum + part.amount,
  0
);

const remaining = selectedOrder
  ? selectedOrder.total - alreadyPaid
  : 0;

if (amount > remainingAmount + 0.001) {
  alert(
    `Payment cannot exceed the remaining amount of ${settings.currencySymbol}${remaining.toFixed(2)}`
  );
  return;
}

  if (!amount || amount <= 0) {
    alert("Please enter a valid amount.");
    return;
  }

  if (amount > remainingAmount + 0.001) {
    alert("Amount cannot be greater than the remaining balance.");
    return;
  }

  if (
    newPaymentMethod === "ticket" &&
    !ticketCode.trim()
  ) {
    alert("Please scan or enter the Ticket Restaurant code.");
    return;
  }

  const newPart: PaymentPart = {
    id: Date.now(),
    method: newPaymentMethod,
    amount,
    ticketCode:
      newPaymentMethod === "ticket"
        ? ticketCode.trim()
        : undefined,
  };

  setPaymentParts((current) => [
    ...current,
    newPart,
  ]);

  setNewPaymentAmount("");
  setTicketCode("");
  
};
const removePaymentPart = (id: number) => {
  setPaymentParts((current) =>
    current.filter((part) => part.id !== id)
  );
};
  return (
    <StaffGuard>
    <main className="min-h-screen bg-[#0d0f10] text-white">

      {/* HEADER */}

      <header className="flex items-center gap-5 border-b border-white/10 px-5 py-3">

        <div className="min-w-[310px]">
          <h1 className="text-2xl font-black">
            DINE
            <span className="text-red-500">
              VO
            </span>
            <span className="ml-5 text-xl">
              CASHIER COUNTER
            </span>
          </h1>
        </div>

        <input
          value={search}
          onChange={(e) =>
            setSearch(
              e.target.value
            )
          }
          placeholder="Search by Table / Order # / Guest Name"
          className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#171a1d] px-5 py-3 outline-none"
        />

        <div className="rounded-xl bg-[#171a1d] px-4 py-3 font-bold">
          Open Orders{" "}
          <span className="ml-2 rounded-full bg-red-600 px-2 py-1 text-xs">
            {openOrders.length}
          </span>
        </div>

        <div className="rounded-xl bg-[#171a1d] px-4 py-3 text-center">
          <p className="font-bold">
            {now
  ? new Date(now).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })
  : "--:--"}
          </p>

          <p className="text-xs text-gray-400">
            {now
  ? new Date(now).toLocaleDateString()
  : "--/--/----"}
          </p>
        </div>

      </header>

      {/* MAIN GRID */}

      <section className="grid h-[570px] grid-cols-[290px_minmax(0,1fr)_390px] gap-4 p-4 pb-2">

        {/* LEFT OPEN ORDERS */}

        <aside className="flex min-h-0 flex-col rounded-2xl border border-white/10 bg-[#131619] p-4">

          <div className="mb-4 flex items-center justify-between">

            <h2 className="font-black">
              OPEN ORDERS
            </h2>

            <span className="rounded-lg bg-[#202428] px-3 py-2 text-xs">
              Oldest First
            </span>

          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-2">

            {openOrders.map((order) => {

              const isSelected =
                order.id ===
                selectedOrderId;

            return (
  <button
    key={order.id}
    onClick={() => {
      setSelectedOrderId(order.id);
      setPaymentParts([]);
      setNewPaymentAmount("");
      setTicketCode("");
      setNewPaymentMethod("cash");
    }}
                  className={`w-full rounded-xl border p-4 text-left ${
                    isSelected
                      ? "border-red-500 bg-red-500/10"
                      : "border-white/5 bg-[#1b1f22]"
                  }`}
                >

                  <div className="flex justify-between">

                    <div>

                      <p className="font-bold">
                        Order #
                        {
                          order.orderNumber
                        }
                      </p>

                      <p className="mt-1 text-sm text-gray-400">
                        Table{" "}
                        {
                          order.tableNumber
                        }
                      </p>

                    </div>

                    <div className="text-right">

                      <p className="font-black">
                        {settings.currencySymbol}
                        {order.total.toFixed(
                          2
                        )}
                      </p>

                      <p className="mt-1 text-xs text-blue-400">
                        UNPAID
                      </p>

                    </div>

                  </div>

                </button>

              );
            })}

          </div>

          <div className="mt-5 border-t border-white/10 pt-4 text-sm text-gray-400">
            Total Open Orders:
            <span className="ml-2 font-bold text-white">
              {openOrders.length}
            </span>
          </div>

        </aside>

        {/* CENTER ORDER DETAILS */}

        <section className="min-h-0 overflow-y-auto rounded-2xl border border-white/10 bg-[#131619] p-5">

          {!selectedOrder ? (

            <div className="flex min-h-[500px] items-center justify-center text-gray-500">
              Select an open order.
            </div>

          ) : (

            <>

              <div className="flex items-start justify-between border-b border-white/10 pb-5">

                <div>

                  <p className="text-sm text-gray-400">
                    TABLE
                  </p>

                  <h2 className="text-2xl font-black">
                    {
                      selectedOrder.tableNumber
                    }
                  </h2>

                </div>

                <div className="text-right">

  <div className="mb-3 flex items-center justify-end gap-2">

    <span
      className={`rounded-lg px-3 py-2 text-xs font-black ${
        selectedOrder.paymentStatus === "paid"
          ? "bg-green-500/15 text-green-500"
          : "bg-blue-500/15 text-blue-400"
      }`}
    >
      {selectedOrder.paymentStatus === "paid"
        ? "PAID"
        : "UNPAID"}
    </span>

    <button
      onClick={printSelectedOrder}
      className="rounded-lg border border-white/10 bg-[#1a1e21] px-3 py-2 text-xs font-bold hover:bg-[#24282c]"
    >
      🖨{" "}
      {selectedOrder.paymentStatus === "paid"
        ? "Reprint Slip"
        : "Print Slip"}
    </button>

  </div>

  <p className="text-xl font-bold">
    Order #{selectedOrder.orderNumber}
  </p>

  <p className="mt-1 text-sm text-gray-400">
    {selectedOrder.guests.length} Guests
  </p>

</div>

              </div>

              <div className="mt-5 space-y-4">

                {selectedOrder.guests.map(
                  (guest, guestIndex) => {

                    const guestTotal =
                      guest.items.reduce(
                        (
                          sum,
                          item
                        ) =>
                          sum +
                          item.price *
                            item.quantity,
                        0
                      );

                    return (

                      <div
                        key={`${guest.guestName}-${guestIndex}`}
                        className="rounded-xl border border-white/10 bg-[#1a1e21]"
                      >

                        <div className="border-b border-white/10 px-4 py-3 font-bold text-red-400">
                          {
                            guest.guestName
                          }
                        </div>

                        <div className="p-4">

                          {guest.items.map(
                            (item) => (

                              <div
                                key={item.id}
                                className="flex justify-between py-2"
                              >

                                <div className="flex gap-3">

                                  <span>
                                    {
                                      item.quantity
                                    }
                                  </span>

                                  <span>
                                    {
                                      item.name
                                    }
                                  </span>

                                </div>

                                <strong>
                                  {settings.currencySymbol}
                                  {(
                                    item.price *
                                    item.quantity
                                  ).toFixed(
                                    2
                                  )}
                                </strong>

                              </div>

                            )
                          )}

                          <div className="mt-3 flex justify-between border-t border-white/10 pt-3">

                            <span className="text-sm text-gray-400">
                              Guest Total
                            </span>

                            <strong className="text-red-400">
                              {settings.currencySymbol}
                              {guestTotal.toFixed(
                                2
                              )}
                            </strong>

                          </div>

                        </div>

                      </div>

                    );
                  }
                )}

              </div>

              <div className="mt-6 flex justify-between border-t border-white/10 pt-5">

                <span className="text-xl font-bold">
                  TOTAL AMOUNT
                </span>

                <span className="text-2xl font-black">
                  {settings.currencySymbol}
                  {selectedOrder.total.toFixed(
                    2
                  )}
                </span>

              </div>

            </>

          )}

        </section>

        {/* RIGHT PAYMENT */}

        <aside className="min-h-0 overflow-y-auto rounded-2xl border border-white/10 bg-[#131619] p-5">

          <h2 className="text-xl font-black">
            PAYMENT
          </h2>
          {selectedOrder?.paymentStatus === "paid" && (
  <div className="mt-4 rounded-xl border border-green-500/20 bg-green-500/10 p-3 text-sm font-bold text-green-400">
    This order is already paid. Payment editing is locked.
  </div>
)}
<p className="mt-6 text-sm text-gray-400">
  Add Payment
</p>

<div className="mt-3 grid grid-cols-4 gap-2">

  {[
    { value: "cash", label: "Cash", icon: "💵" },
    { value: "card", label: "Card", icon: "💳" },
    { value: "ticket", label: "Ticket", icon: "🎫" },
    { value: "other", label: "Other", icon: "•••" },
  ].map((method) => (

    <button
      key={method.value}
      onClick={() => {
        setNewPaymentMethod(
          method.value as
            | "cash"
            | "card"
            | "ticket"
            | "other"
        );

        if (method.value === "ticket") {
         
        } else {
        
        }
      }}
      disabled={selectedOrder?.paymentStatus === "paid"}
      className={`rounded-xl border px-2 py-4 text-center transition ${
        newPaymentMethod === method.value
        
          ? "border-green-500 bg-green-500/10"
          : "border-white/10 bg-[#1a1e21]"
      }`}
    >

      <div className="text-xl">
        {method.icon}
      </div>

      <div className="mt-1 text-xs font-bold">
        {method.label}
      </div>

    </button>

  ))}

</div>

<div className="mt-5">

  <label className="text-sm text-gray-400">
    Amount
  </label>

  <div className="mt-2 flex gap-2">

    <input
      type="number"
      min="0"
      step="0.01"
      value={newPaymentAmount}
      onChange={(e) =>
        setNewPaymentAmount(e.target.value)
      }
      placeholder={`Remaining ${settings.currencySymbol}${remainingAmount.toFixed(2)}`}
      className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#1a1e21] px-4 py-3 text-lg outline-none focus:border-green-500"
    />

    <button
      onClick={() =>
        setNewPaymentAmount(
          remainingAmount.toFixed(2)
        )
      }
      disabled={
  !selectedOrder ||
  selectedOrder.paymentStatus === "paid"
}
      className="rounded-xl border border-white/10 bg-[#1a1e21] px-4 text-xs font-bold"
    >
      FULL
    </button>

  </div>

</div>
{newPaymentMethod === "ticket" && (
  <div className="mt-4 rounded-xl border border-white/10 bg-[#1a1e21] p-4">
    <p className="text-sm font-bold text-white">
      Ticket Restaurant
    </p>

    <div className="mt-3 flex gap-2">
      <input
        type="text"
        value={ticketCode}
        onChange={(e) => setTicketCode(e.target.value)}
        placeholder="Scan or enter barcode"
        className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#0d0f10] px-4 py-3 text-white outline-none"
      />

    <button
  type="button"
  className="rounded-xl bg-white px-4 py-3 font-bold text-black"
>
  📷 Scan
</button>
    </div>
  </div>
)}

<button
  onClick={addPaymentPart}
  disabled={
  !selectedOrder ||
  selectedOrder.paymentStatus === "paid" ||
  remainingAmount <= 0
}
  className="mt-4 w-full rounded-xl bg-red-600 px-4 py-3 font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
>
  + ADD PAYMENT
</button>

<div className="mt-6 space-y-2">
  {paymentParts.map((part) => (
    <div
      key={part.id}
      className="flex items-center justify-between rounded-xl bg-[#1a1e21] p-3"
    >
      <div>
        <p className="text-sm font-bold capitalize">
          {part.method === "ticket"
            ? "🎫 Ticket Restaurant"
            : part.method}
        </p>

        {part.ticketCode && (
          <p className="mt-1 text-[10px] text-gray-500">
            Code: {part.ticketCode}
          </p>
        )}
      </div>

      <div className="flex items-center gap-3">
        <strong>
          {settings.currencySymbol}
          {part.amount.toFixed(2)}
        </strong>

        <button
          onClick={() => removePaymentPart(part.id)}
          className="text-xs font-bold text-red-500"
        >
          ✕
        </button>
      </div>
    </div>
  ))}
</div>

{paymentParts.length > 0 && (
  <div className="mt-4 rounded-xl border border-white/10 bg-[#1a1e21] p-4">
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-400">Paid</span>
      <span className="font-bold text-green-400">
         {settings.currencySymbol}
        {paidAmount.toFixed(2)}
      </span>
    </div>

    <div className="mt-3 flex items-center justify-between">
      <span className="font-bold text-white">Remaining</span>
      <span
        className={`text-lg font-black ${
          remainingAmount <= 0
            ? "text-green-400"
            : "text-red-500"
        }`}
      >
        {settings.currencySymbol}
        {remainingAmount.toFixed(2)}
      </span>
    </div>
  </div>
)}
          <div className="mt-7 rounded-xl bg-[#1a1e21] p-5">

            <div className="flex justify-between">

              <span>
                Subtotal
              </span>

              <strong>
  {settings.currencySymbol}
  {selectedOrder
    ? (
        selectedOrder.total /
        (1 + settings.taxRate / 100)
      ).toFixed(2)
    : "0.00"}
</strong>

            </div>

            <div className="mt-3 flex justify-between text-gray-400">

  <span>
    Tax ({settings.taxRate}%)
  </span>

  <span>
    {settings.currencySymbol}
    {selectedOrder
      ? (
          selectedOrder.total -
          selectedOrder.total /
            (1 + settings.taxRate / 100)
        ).toFixed(2)
      : "0.00"}
  </span>

</div>

            <div className="mt-5 flex justify-between border-t border-white/10 pt-5">

              <strong className="text-xl">
                TOTAL
              </strong>

              <strong className="text-3xl text-green-500">
                {settings.currencySymbol}
                {selectedOrder
  ? selectedOrder.total.toFixed(2)
  : "0.00"}
              </strong>

            </div>

          </div>

         

          <button
            onClick={completePayment}
           disabled={
  !selectedOrder ||
  selectedOrder.paymentStatus === "paid"
}
            className="mt-7 w-full rounded-xl bg-green-600 py-4 text-lg font-black hover:bg-green-700 disabled:bg-gray-700"
          >
            ✓ COMPLETE PAYMENT
          </button>

        </aside>

      </section>

      {/* BOTTOM */}

      <section className="grid grid-cols-[290px_minmax(0,1fr)] gap-4 px-4 pb-4 pt-2">

        

      {/* QUICK ACTIONS */}

<div className="rounded-2xl border border-white/10 bg-[#131619] p-4">

  <h3 className="font-bold">
    QUICK ACTIONS
  </h3>

  <div className="mt-4 grid grid-cols-3 gap-2">

    <button
      onClick={() =>
        router.push("/cashier/manual-order")
      }
      className="rounded-xl bg-[#1a1e21] p-4 text-xs"
    >
      Manual Order
    </button>

    <button
      onClick={printSelectedOrder}
      disabled={!selectedOrder}
      className="rounded-xl bg-[#1a1e21] p-4 text-xs disabled:opacity-40"
    >
      Print Selected
    </button>

    <button
      className="rounded-xl bg-[#1a1e21] p-4 text-xs"
    >
      Hold Order
    </button>

  </div>

</div>

        {/* TODAY'S PAID ORDERS */}

        <div className="rounded-2xl border border-green-500/20 bg-[#131619] p-4">

          <div className="flex items-center justify-between">

            <div>

              <h3 className="font-bold text-green-500">
                TODAY'S PAID ORDERS
              </h3>

              <p className="mt-1 text-xs text-gray-500">
                Only payments completed today appear here.
              </p>

            </div>

            <span className="text-sm text-gray-400">
              {
                todayPaidOrders.length
              }{" "}
              Paid
            </span>

          </div>

          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">

            {todayPaidOrders.length === 0 ? (
              <div className="rounded-lg bg-[#1a1e21] px-4 py-3 text-sm text-gray-500">
                No paid orders yet today.
              </div>
            ) : (
              todayPaidOrders.map((order) => (
                <button
                  key={order.id}
                  onClick={() => {
  setSelectedOrderId(order.id);

  setPaymentParts([]);
  setNewPaymentAmount("");
  setTicketCode("");
  setNewPaymentMethod("cash");
}}
                  className={`shrink-0 rounded-lg border px-4 py-3 text-left ${
                    selectedOrderId === order.id
                      ? "border-green-500 bg-green-500/10"
                      : "border-white/10 bg-[#1a1e21]"
                  }`}
                >
                  <span className="text-xs text-gray-500">Order</span>
                  <p className="font-black text-white">#{order.orderNumber}</p>
                </button>
              ))
            )}

          </div>

        </div>

      </section>



    </main>
    </StaffGuard>
  );
}