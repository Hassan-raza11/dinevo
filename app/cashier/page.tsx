"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
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

type PaymentMethod =
  | "cash"
  | "card"
  | "ticket"
  | "other";

type PaymentPart = {
  id: number;
  method: PaymentMethod;
  amount: number;
  ticketCode?: string;
};

type CashierItem = {
  id: number;
  name: string;
  quantity: number;
  price: number;
  station?: string;
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
  kitchenStatus?: string;
  waiterStatus?: string;
  paymentStatus?: "unpaid" | "paid";
  paymentBreakdown: PaymentPart[];
  paidAt?: number;
};

const defaultSettings: RestaurantSettings = {
  restaurantName: "Dinevo Restaurant",
  taxRate: 10,
  preparationTime: 15,
  currency: "EUR",
  currencySymbol: "€",
};

export default function CashierPage() {
  const router = useRouter();

  const [settings, setSettings] =
    useState<RestaurantSettings>(defaultSettings);

  const [orders, setOrders] =
    useState<CashierOrder[]>([]);

  const [selectedOrderId, setSelectedOrderId] =
    useState<number | null>(null);

  const [search, setSearch] = useState("");
  const [now, setNow] = useState<number | null>(null);

  const [paymentParts, setPaymentParts] =
    useState<PaymentPart[]>([]);

  const [newPaymentMethod, setNewPaymentMethod] =
    useState<PaymentMethod>("cash");

  const [newPaymentAmount, setNewPaymentAmount] =
    useState("");

  const [ticketCode, setTicketCode] = useState("");
  const [showTicketScanner, setShowTicketScanner] =
    useState(false);

  const [isPaying, setIsPaying] = useState(false);

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
      console.error(
        "Cashier settings load error:",
        error
      );
      return;
    }

    if (!data) return;

    setSettings({
      restaurantName:
        data.restaurant_name ||
        defaultSettings.restaurantName,

      taxRate:
        Number(data.tax_rate) ||
        defaultSettings.taxRate,

      preparationTime:
        Number(data.preparation_time) ||
        defaultSettings.preparationTime,

      currency:
        data.currency ||
        defaultSettings.currency,

      currencySymbol:
        data.currency_symbol ||
        defaultSettings.currencySymbol,
    });
  }, []);

  const loadOrders = useCallback(async () => {
    const { data, error } = await supabase
      .from("orders")
      .select(
        `
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
      `
      )
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
      id: Number(order.id),
      orderNumber: String(
        order.order_number ?? ""
      ),
      tableNumber: String(
        order.table_number ?? ""
      ),
      createdAt: new Date(
        order.created_at
      ).getTime(),

      total: Number(order.total) || 0,

      kitchenStatus:
        order.kitchen_status ?? undefined,

      waiterStatus:
        order.waiter_status ?? undefined,

      paymentStatus:
        order.payment_status === "paid"
          ? "paid"
          : "unpaid",

      paidAt: order.paid_at
        ? new Date(order.paid_at).getTime()
        : undefined,

      guests: (order.order_guests || []).map(
        (guest: any) => ({
          guestName: String(
            guest.guest_name ?? "Guest"
          ),

          items: (
            guest.order_items || []
          ).map((item: any) => ({
            id: Number(item.id),
            name: String(
              item.item_name ?? "Item"
            ),
            price: Number(item.price) || 0,
            quantity: Math.max(
              1,
              Number(item.quantity) || 1
            ),
            station:
              item.station ?? undefined,
          })),
        })
      ),

      paymentBreakdown: (
        order.payments || []
      ).map((payment: any) => ({
        id: Number(payment.id),
        method:
          payment.method as PaymentMethod,
        amount: Number(payment.amount) || 0,
      })),
    }));

    setOrders(cashierOrders);

    setSelectedOrderId((currentId) => {
      if (
        currentId !== null &&
        cashierOrders.some(
          (order) => order.id === currentId
        )
      ) {
        return currentId;
      }

      const firstUnpaid =
        cashierOrders.find(
          (order) =>
            order.paymentStatus !== "paid"
        );

      if (firstUnpaid) {
        return firstUnpaid.id;
      }

      return cashierOrders[0]?.id ?? null;
    });
  }, []);

  useEffect(() => {
    setNow(Date.now());

    loadSettings();
    loadOrders();

    const clockInterval = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    const backupRefreshInterval =
      setInterval(() => {
        loadOrders();
      }, 5000);

    const cashierChannel = supabase
      .channel("dinevo-cashier-live")

      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
        },
        () => loadOrders()
      )

      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "order_guests",
        },
        () => loadOrders()
      )

      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "order_items",
        },
        () => loadOrders()
      )

      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "payments",
        },
        () => loadOrders()
      )

      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "restaurant_settings",
        },
        () => loadSettings()
      )

      .subscribe();

    return () => {
      clearInterval(clockInterval);
      clearInterval(backupRefreshInterval);
      supabase.removeChannel(cashierChannel);
    };
  }, [loadOrders, loadSettings]);

  const openOrders = useMemo(() => {
    const query = search
      .trim()
      .toLowerCase();

    return orders
      .filter(
        (order) =>
          order.paymentStatus !== "paid"
      )
      .filter((order) => {
        if (!query) return true;

        const text = [
          order.tableNumber,
          order.orderNumber,
          ...order.guests.map(
            (guest) => guest.guestName
          ),
        ]
          .join(" ")
          .toLowerCase();

        return text.includes(query);
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

  const paidAmount = useMemo(
    () =>
      paymentParts.reduce(
        (sum, part) =>
          sum + part.amount,
        0
      ),
    [paymentParts]
  );

  const remainingAmount = Math.max(
    0,
    (selectedOrder?.total || 0) -
      paidAmount
  );

  const selectOrder = (id: number) => {
    setSelectedOrderId(id);
    setPaymentParts([]);
    setNewPaymentAmount("");
    setTicketCode("");
    setShowTicketScanner(false);
  };

  const addPaymentPart = () => {
    if (!selectedOrder) return;

    if (
      selectedOrder.paymentStatus === "paid"
    ) {
      alert(
        "This order has already been paid."
      );
      return;
    }

    const amount =
      Number(newPaymentAmount);

    if (!amount || amount <= 0) {
      alert(
        "Please enter a valid amount."
      );
      return;
    }

    if (
      amount >
      remainingAmount + 0.001
    ) {
      alert(
        "Amount cannot be greater than the remaining balance."
      );
      return;
    }

    if (
      newPaymentMethod === "ticket" &&
      !ticketCode.trim()
    ) {
      alert(
        "Please scan or enter the Ticket Restaurant code."
      );
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
    setShowTicketScanner(false);
  };

  const removePaymentPart = (
    id: number
  ) => {
    setPaymentParts((current) =>
      current.filter(
        (part) => part.id !== id
      )
    );
  };

  const completePayment = async () => {
    if (
      !selectedOrder ||
      isPaying
    ) {
      return;
    }

    if (
      selectedOrder.paymentStatus === "paid"
    ) {
      alert(
        "This order has already been paid."
      );
      return;
    }

    if (paymentParts.length === 0) {
      alert(
        "Please add at least one payment."
      );
      return;
    }

    const totalPaid =
      paymentParts.reduce(
        (sum, part) =>
          sum + part.amount,
        0
      );

    const difference =
      selectedOrder.total -
      totalPaid;

    if (
      Math.abs(difference) > 0.01
    ) {
      alert(
        `Payment is incomplete. Remaining amount: ${settings.currencySymbol}${Math.max(
          0,
          difference
        ).toFixed(2)}`
      );
      return;
    }

    setIsPaying(true);

    const paymentRows =
      paymentParts.map((part) => ({
        order_id: selectedOrder.id,
        method: part.method,
        amount: part.amount,
      }));

    const { error: paymentError } =
      await supabase
        .from("payments")
        .insert(paymentRows);

    if (paymentError) {
      console.error(
        "Supabase payment insert error:",
        paymentError
      );

      setIsPaying(false);
      alert(
        "Could not save payment."
      );
      return;
    }

    const paidAt = new Date();

    const {
      error: orderPaymentError,
    } = await supabase
      .from("orders")
      .update({
        payment_status: "paid",
        paid_at: paidAt.toISOString(),
      })
      .eq("id", selectedOrder.id);

    if (orderPaymentError) {
      console.error(
        "Supabase order payment update error:",
        orderPaymentError
      );

      setIsPaying(false);
      alert(
        "Payment was saved, but the order status could not be updated."
      );
      return;
    }

    setPaymentParts([]);
    setNewPaymentAmount("");
    setTicketCode("");
    setShowTicketScanner(false);

    await loadOrders();

    setIsPaying(false);
  };

  const printSelectedOrder = () => {
    if (!selectedOrder) {
      alert("Please select an order first.");
      return;
    }

    const symbol = settings.currencySymbol;

    const escapeHtml = (value: unknown) =>
      String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

    const status =
      selectedOrder.paymentStatus === "paid"
        ? "PAID"
        : "UNPAID";

    const safeTaxRate = Math.max(
      0,
      Number(settings.taxRate) || 0
    );

    // Menu prices already include tax.
    const subtotal =
      safeTaxRate > 0
        ? selectedOrder.total /
          (1 + safeTaxRate / 100)
        : selectedOrder.total;

    const taxAmount =
      selectedOrder.total - subtotal;

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
              <div class="item-row">
                <div class="item-name">
                  <span class="qty">${item.quantity}×</span>
                  <span>${escapeHtml(item.name)}</span>
                </div>

                <div class="money">
                  ${escapeHtml(symbol)}${(
                    item.price * item.quantity
                  ).toFixed(2)}
                </div>
              </div>
            `
          )
          .join("");

        return `
          <section class="guest">
            <div class="guest-name">
              ${escapeHtml(guest.guestName)}
            </div>

            ${items}

            <div class="guest-total">
              <span>Guest Total</span>
              <strong>
                ${escapeHtml(symbol)}${guestTotal.toFixed(2)}
              </strong>
            </div>
          </section>
        `;
      })
      .join("");

    const paymentRows =
      selectedOrder.paymentBreakdown.length > 0
        ? selectedOrder.paymentBreakdown
            .map((part) => {
              const label =
                part.method === "ticket"
                  ? "Ticket Restaurant"
                  : part.method.toUpperCase();

              return `
                <div class="payment-row">
                  <span>${escapeHtml(label)}</span>
                  <strong class="money">
                    ${escapeHtml(symbol)}${part.amount.toFixed(2)}
                  </strong>
                </div>
              `;
            })
            .join("")
        : `
            <div class="payment-row">
              <span>Paid</span>
              <strong class="money">
                ${escapeHtml(symbol)}${selectedOrder.total.toFixed(2)}
              </strong>
            </div>
          `;

    const paidInformation =
      selectedOrder.paymentStatus === "paid"
        ? `
          <section class="payment-section">
            <div class="section-title">PAYMENT</div>

            ${paymentRows}

            ${
              selectedOrder.paidAt
                ? `
                  <div class="payment-row paid-at">
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
          </section>
        `
        : `
          <div class="unpaid">
            PLEASE PAY AT THE CASH COUNTER
          </div>
        `;

    const printWindow = window.open(
      "",
      "_blank",
      "width=420,height=760"
    );

    if (!printWindow) {
      alert("Please allow popups to print the slip.");
      return;
    }

    printWindow.document.open();

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />

          <meta
            name="viewport"
            content="width=device-width, initial-scale=1"
          />

          <title>
            Receipt ${escapeHtml(selectedOrder.orderNumber)}
          </title>

          <style>
            @page {
              size: 80mm auto;
              margin: 0;
            }

            * {
              box-sizing: border-box;
            }

            html,
            body {
              width: 80mm;
              margin: 0;
              padding: 0;
              background: #ffffff;
              color: #000000;
              font-family:
                Arial,
                Helvetica,
                sans-serif;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }

            body {
              font-size: 11px;
              line-height: 1.35;
            }

            .receipt {
              width: 80mm;
              padding: 4mm 4mm 5mm;
              margin: 0 auto;
              overflow: hidden;
            }

            .brand {
              width: 100%;
              text-align: center;
              font-size: 20px;
              line-height: 1.1;
              font-weight: 900;
              overflow-wrap: anywhere;
            }

            .powered {
              margin-top: 2px;
              text-align: center;
              font-size: 9px;
              font-weight: 600;
            }

            .divider {
              width: 100%;
              margin: 8px 0;
              border-top: 1px dashed #000;
            }

            .top {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 8px;
              align-items: start;
            }

            .table-label {
              font-size: 9px;
              font-weight: 700;
            }

            .table-number {
              margin-top: -2px;
              font-size: 28px;
              line-height: 1;
              font-weight: 900;
            }

            .order-info {
              min-width: 0;
              text-align: right;
              font-size: 10px;
              line-height: 1.45;
              overflow-wrap: anywhere;
            }

            .status {
              margin: 9px 0;
              border: 1.5px solid #000;
              padding: 5px 4px;
              text-align: center;
              font-size: 11px;
              font-weight: 900;
            }

            .guest {
              margin-top: 10px;
            }

            .guest-name {
              margin-bottom: 4px;
              padding-bottom: 4px;
              border-bottom: 1px solid #000;
              font-size: 11px;
              font-weight: 900;
              text-transform: uppercase;
              overflow-wrap: anywhere;
            }

            .item-row,
            .guest-total,
            .summary-row,
            .payment-row,
            .total-row {
              display: flex;
              align-items: flex-start;
              justify-content: space-between;
              gap: 8px;
              width: 100%;
            }

            .item-row {
              padding: 3px 0;
            }

            .item-name {
              display: flex;
              min-width: 0;
              flex: 1;
              gap: 4px;
              padding-right: 3px;
              overflow-wrap: anywhere;
              word-break: break-word;
            }

            .qty {
              flex: 0 0 auto;
              font-weight: 700;
            }

            .money {
              flex: 0 0 auto;
              white-space: nowrap;
              text-align: right;
            }

            .guest-total {
              margin-top: 4px;
              padding-top: 5px;
              border-top: 1px dotted #777;
              font-weight: 700;
            }

            .summary {
              margin-top: 2px;
            }

            .summary-row {
              padding: 2px 0;
            }

            .total-row {
              align-items: center;
              padding: 3px 0;
              font-size: 19px;
              font-weight: 900;
            }

            .section-title {
              margin-bottom: 5px;
              font-size: 10px;
              font-weight: 900;
            }

            .payment-section {
              margin-top: 4px;
            }

            .payment-row {
              padding: 2px 0;
            }

            .paid-at {
              margin-top: 5px;
              padding-top: 5px;
              border-top: 1px dotted #777;
            }

            .unpaid {
              margin-top: 5px;
              border: 1.5px solid #000;
              padding: 7px 4px;
              text-align: center;
              font-size: 10px;
              font-weight: 900;
            }

            .footer {
              margin-top: 13px;
              text-align: center;
              font-size: 11px;
              font-weight: 900;
            }

            .footer-small {
              margin-top: 2px;
              text-align: center;
              font-size: 8px;
              font-weight: 500;
            }

            @media print {
              html,
              body {
                width: 80mm !important;
                min-width: 80mm !important;
                max-width: 80mm !important;
              }

              .receipt {
                width: 80mm !important;
                min-width: 80mm !important;
                max-width: 80mm !important;
              }
            }
          </style>
        </head>

        <body>
          <div class="receipt">
            <div class="brand">
              ${escapeHtml(settings.restaurantName)}
            </div>

            <div class="powered">
              Powered by DINEVO
            </div>

            <div class="divider"></div>

            <div class="top">
              <div>
                <div class="table-label">TABLE</div>

                <div class="table-number">
                  ${escapeHtml(selectedOrder.tableNumber)}
                </div>
              </div>

              <div class="order-info">
                <strong>
                  Order #${escapeHtml(selectedOrder.orderNumber)}
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

            <section class="summary">
              <div class="summary-row">
                <span>Subtotal</span>

                <strong class="money">
                  ${escapeHtml(symbol)}${subtotal.toFixed(2)}
                </strong>
              </div>

              <div class="summary-row">
                <span>Tax</span>

                <strong class="money">
                  ${escapeHtml(symbol)}${taxAmount.toFixed(2)}
                </strong>
              </div>
            </section>

            <div class="divider"></div>

            <div class="total-row">
              <span>TOTAL</span>

              <span class="money">
                ${escapeHtml(symbol)}${selectedOrder.total.toFixed(2)}
              </span>
            </div>

            <div class="divider"></div>

            ${paidInformation}

            <div class="footer">
              THANK YOU!
            </div>

            <div class="footer-small">
              ${escapeHtml(settings.restaurantName)}
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

  const taxRate = Math.max(
    0,
    Number(settings.taxRate) || 0
  );

  const subtotal =
    selectedOrder
      ? taxRate > 0
        ? selectedOrder.total /
          (1 + taxRate / 100)
        : selectedOrder.total
      : 0;

  const taxAmount =
    selectedOrder
      ? selectedOrder.total -
        subtotal
      : 0;

  const canCompletePayment =
    !!selectedOrder &&
    selectedOrder.paymentStatus !== "paid" &&
    paymentParts.length > 0 &&
    remainingAmount <= 0.01 &&
    !isPaying;

  return (
    <StaffGuard>
      <main className="min-h-screen bg-[#0d0f10] text-white">
        {/* HEADER */}

        <header className="flex shrink-0 items-center gap-5 border-b border-white/10 px-5 py-3">
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
              setSearch(e.target.value)
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
                ? new Date(
                    now
                  ).toLocaleTimeString(
                    [],
                    {
                      hour: "2-digit",
                      minute: "2-digit",
                    }
                  )
                : "--:--"}
            </p>

            <p className="text-xs text-gray-400">
              {now
                ? new Date(
                    now
                  ).toLocaleDateString()
                : "--/--/----"}
            </p>
          </div>
        </header>

        {/* MAIN GRID */}

        <section className="grid h-[570px] grid-cols-[290px_minmax(0,1fr)_390px] gap-4 p-4 pb-2">
          {/* OPEN ORDERS */}

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
              {openOrders.map((order) => (
                <button
                  key={order.id}
                  onClick={() =>
                    selectOrder(order.id)
                  }
                  className={`w-full rounded-xl border p-4 text-left ${
                    selectedOrderId ===
                    order.id
                      ? "border-red-500 bg-red-500/10"
                      : "border-white/5 bg-[#1b1f22]"
                  }`}
                >
                  <div className="flex justify-between gap-3">
                    <div>
                      <p className="font-bold">
                        Order #{order.orderNumber}
                      </p>

                      <p className="mt-1 text-sm text-gray-400">
                        Table {order.tableNumber}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="font-black">
                        {settings.currencySymbol}
                        {order.total.toFixed(2)}
                      </p>

                      <p className="mt-1 text-xs text-blue-400">
                        UNPAID
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-5 border-t border-white/10 pt-4 text-sm text-gray-400">
              Total Open Orders:
              <span className="ml-2 font-bold text-white">
                {openOrders.length}
              </span>
            </div>
          </aside>

          {/* ORDER DETAILS */}

          <section className="min-h-0 overflow-y-auto rounded-2xl border border-white/10 bg-[#131619] p-5">
            {!selectedOrder ? (
              <div className="flex min-h-[500px] items-center justify-center text-gray-500">
                Select an order.
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between border-b border-white/10 pb-5">
                  <div>
                    <p className="text-sm text-gray-400">
                      TABLE
                    </p>

                    <h2 className="text-3xl font-black">
                      {selectedOrder.tableNumber}
                    </h2>
                  </div>

                  <div className="text-right">
                    <div className="mb-3 flex items-center justify-end gap-2">
                      <span
                        className={`rounded-lg px-3 py-2 text-xs font-black ${
                          selectedOrder.paymentStatus ===
                          "paid"
                            ? "bg-green-500/15 text-green-500"
                            : "bg-blue-500/15 text-blue-400"
                        }`}
                      >
                        {selectedOrder.paymentStatus ===
                        "paid"
                          ? "PAID"
                          : "UNPAID"}
                      </span>

                      <button
                        onClick={printSelectedOrder}
                        className="rounded-lg border border-white/10 bg-[#1a1e21] px-3 py-2 text-xs font-bold hover:bg-[#24282c]"
                      >
                        🖨{" "}
                        {selectedOrder.paymentStatus ===
                        "paid"
                          ? "Reprint Slip"
                          : "Print Slip"}
                      </button>
                    </div>

                    <p className="text-xl font-bold">
                      Order #
                      {selectedOrder.orderNumber}
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
                          (sum, item) =>
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
                            {guest.guestName}
                          </div>

                          <div className="p-4">
                            {guest.items.map(
                              (item) => (
                                <div
                                  key={item.id}
                                  className="flex justify-between gap-3 py-2"
                                >
                                  <div className="flex gap-3">
                                    <span>
                                      {item.quantity}
                                    </span>
                                    <span>
                                      {item.name}
                                    </span>
                                  </div>

                                  <strong>
                                    {settings.currencySymbol}
                                    {(
                                      item.price *
                                      item.quantity
                                    ).toFixed(2)}
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
                                {guestTotal.toFixed(2)}
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
                    {selectedOrder.total.toFixed(2)}
                  </span>
                </div>
              </>
            )}
          </section>

          {/* PAYMENT */}

          <aside className="min-h-0 overflow-y-auto rounded-2xl border border-white/10 bg-[#131619] p-5">
            <h2 className="text-xl font-black">
              PAYMENT
            </h2>

            {!selectedOrder ? (
              <p className="mt-6 text-sm text-gray-500">
                Select an order first.
              </p>
            ) : selectedOrder.paymentStatus ===
              "paid" ? (
              <div className="mt-6 rounded-2xl border border-green-500/20 bg-green-500/10 p-5">
                <p className="text-lg font-black text-green-500">
                  ✓ PAYMENT COMPLETED
                </p>

                <p className="mt-2 text-sm text-gray-400">
                  This order is read-only.
                </p>

                <div className="mt-5 space-y-2">
                  {selectedOrder.paymentBreakdown.map(
                    (part) => (
                      <div
                        key={part.id}
                        className="flex justify-between rounded-xl bg-black/20 px-3 py-2 text-sm"
                      >
                        <span className="capitalize">
                          {part.method === "ticket"
                            ? "Ticket Restaurant"
                            : part.method}
                        </span>

                        <strong>
                          {settings.currencySymbol}
                          {part.amount.toFixed(2)}
                        </strong>
                      </div>
                    )
                  )}
                </div>

                <p className="mt-5 text-3xl font-black">
                  {settings.currencySymbol}
                  {selectedOrder.total.toFixed(2)}
                </p>
              </div>
            ) : (
              <>
                <p className="mt-6 text-sm text-gray-400">
                  Add Payment
                </p>

                <div className="mt-3 grid grid-cols-4 gap-2">
                  {[
                    {
                      value: "cash",
                      label: "Cash",
                      icon: "💵",
                    },
                    {
                      value: "card",
                      label: "Card",
                      icon: "💳",
                    },
                    {
                      value: "ticket",
                      label: "Ticket",
                      icon: "🎫",
                    },
                    {
                      value: "other",
                      label: "Other",
                      icon: "•••",
                    },
                  ].map((method) => (
                    <button
                      key={method.value}
                      onClick={() => {
                        const value =
                          method.value as PaymentMethod;

                        setNewPaymentMethod(
                          value
                        );

                        setShowTicketScanner(
                          value === "ticket"
                        );
                      }}
                      className={`rounded-xl border px-2 py-4 text-center transition ${
                        newPaymentMethod ===
                        method.value
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
                        setNewPaymentAmount(
                          e.target.value
                        )
                      }
                      placeholder={`Remaining ${settings.currencySymbol}${remainingAmount.toFixed(
                        2
                      )}`}
                      className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#1a1e21] px-4 py-3 text-lg outline-none focus:border-green-500"
                    />

                    <button
                      onClick={() =>
                        setNewPaymentAmount(
                          remainingAmount.toFixed(
                            2
                          )
                        )
                      }
                      className="rounded-xl border border-white/10 bg-[#1a1e21] px-4 text-xs font-bold"
                    >
                      FULL
                    </button>
                  </div>
                </div>

                {newPaymentMethod ===
                  "ticket" && (
                  <div className="mt-4 rounded-xl border border-white/10 bg-[#1a1e21] p-4">
                    <p className="text-sm font-bold">
                      Ticket Restaurant
                    </p>

                    <div className="mt-3 flex gap-2">
                      <input
                        value={ticketCode}
                        onChange={(e) =>
                          setTicketCode(
                            e.target.value
                          )
                        }
                        placeholder="Scan or enter barcode"
                        className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#0d0f10] px-4 py-3 outline-none"
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setShowTicketScanner(
                            true
                          )
                        }
                        className="rounded-xl bg-white px-4 py-3 font-bold text-black"
                      >
                        📷 Scan
                      </button>
                    </div>

                    {showTicketScanner && (
                      <p className="mt-2 text-[11px] text-gray-500">
                        Scanner UI ready. Camera/barcode integration can be connected later.
                      </p>
                    )}
                  </div>
                )}

                <button
                  onClick={addPaymentPart}
                  disabled={
                    remainingAmount <= 0
                  }
                  className="mt-4 w-full rounded-xl bg-red-600 px-4 py-3 font-bold transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
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
                          {part.method ===
                          "ticket"
                            ? "🎫 Ticket Restaurant"
                            : part.method}
                        </p>

                        {part.ticketCode && (
                          <p className="mt-1 text-[10px] text-gray-500">
                            Code:{" "}
                            {part.ticketCode}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <strong>
                          {settings.currencySymbol}
                          {part.amount.toFixed(2)}
                        </strong>

                        <button
                          onClick={() =>
                            removePaymentPart(
                              part.id
                            )
                          }
                          className="text-xs font-bold text-red-500"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {paymentParts.length >
                  0 && (
                  <div className="mt-4 rounded-xl border border-white/10 bg-[#1a1e21] p-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">
                        Paid
                      </span>

                      <strong className="text-green-400">
                        {settings.currencySymbol}
                        {paidAmount.toFixed(2)}
                      </strong>
                    </div>

                    <div className="mt-3 flex justify-between border-t border-white/10 pt-3">
                      <span className="font-bold">
                        Remaining
                      </span>

                      <strong
                        className={
                          remainingAmount <=
                          0.01
                            ? "text-green-400"
                            : "text-red-500"
                        }
                      >
                        {settings.currencySymbol}
                        {remainingAmount.toFixed(
                          2
                        )}
                      </strong>
                    </div>
                  </div>
                )}

                <div className="mt-7 rounded-xl bg-[#1a1e21] p-5">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <strong>
                      {settings.currencySymbol}
                      {subtotal.toFixed(2)}
                    </strong>
                  </div>

                  <div className="mt-3 flex justify-between text-gray-400">
                    <span>
                      Tax (
                      {settings.taxRate}%)
                    </span>

                    <span>
                      {settings.currencySymbol}
                      {taxAmount.toFixed(2)}
                    </span>
                  </div>

                  <div className="mt-5 flex justify-between border-t border-white/10 pt-5">
                    <strong className="text-xl">
                      TOTAL
                    </strong>

                    <strong className="text-3xl text-green-500">
                      {settings.currencySymbol}
                      {selectedOrder.total.toFixed(
                        2
                      )}
                    </strong>
                  </div>
                </div>

                <button
                  onClick={completePayment}
                  disabled={
                    !canCompletePayment
                  }
                  className="mt-7 w-full rounded-xl bg-green-600 py-4 text-lg font-black hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-700"
                >
                  {isPaying
                    ? "PROCESSING..."
                    : "✓ COMPLETE PAYMENT"}
                </button>
              </>
            )}
          </aside>
        </section>

        {/* BOTTOM */}

        <section className="grid grid-cols-[290px_minmax(0,1fr)] gap-4 px-4 pb-4 pt-2">
          <div className="rounded-2xl border border-white/10 bg-[#131619] p-4">
            <h3 className="font-bold">
              QUICK ACTIONS
            </h3>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <button
                onClick={() =>
                  router.push(
                    "/cashier/manual-order"
                  )
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
                disabled
                title="Coming later"
                className="rounded-xl bg-[#1a1e21] p-4 text-xs opacity-40"
              >
                Hold Order
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-green-500/20 bg-[#131619] p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-green-500">
                  TODAY&apos;S PAID ORDERS
                </h3>

                <p className="mt-1 text-xs text-gray-500">
                  Only payments completed today appear here.
                </p>
              </div>

              <span className="text-sm text-gray-400">
                {todayPaidOrders.length} Paid
              </span>
            </div>

            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {todayPaidOrders.length ===
              0 ? (
                <div className="rounded-lg bg-[#1a1e21] px-4 py-3 text-sm text-gray-500">
                  No paid orders yet today.
                </div>
              ) : (
                todayPaidOrders.map(
                  (order) => (
                    <button
                      key={order.id}
                      onClick={() =>
                        selectOrder(order.id)
                      }
                      className={`min-w-[220px] shrink-0 rounded-lg border px-4 py-3 text-left ${
                        selectedOrderId ===
                        order.id
                          ? "border-green-500 bg-green-500/10"
                          : "border-white/10 bg-[#1a1e21]"
                      }`}
                    >
                      <div className="flex justify-between">
                        <strong>
                          Table{" "}
                          {order.tableNumber}
                        </strong>

                        <span className="text-xs font-bold text-green-500">
                          PAID
                        </span>
                      </div>

                      <p className="mt-1 text-xs text-gray-500">
                        Order #
                        {order.orderNumber}
                      </p>

                      <div className="mt-3 space-y-1">
                        {order.paymentBreakdown.map(
                          (part) => (
                            <div
                              key={part.id}
                              className="flex justify-between text-xs"
                            >
                              <span className="capitalize text-gray-400">
                                {part.method ===
                                "ticket"
                                  ? "Ticket Restaurant"
                                  : part.method}
                              </span>

                              <strong>
                                {settings.currencySymbol}
                                {part.amount.toFixed(
                                  2
                                )}
                              </strong>
                            </div>
                          )
                        )}
                      </div>

                      <div className="mt-3 flex justify-between border-t border-white/10 pt-2">
                        <strong>
                          {settings.currencySymbol}
                          {order.total.toFixed(2)}
                        </strong>

                        <span className="text-xs text-gray-500">
                          {order.paidAt
                            ? new Date(
                                order.paidAt
                              ).toLocaleTimeString(
                                [],
                                {
                                  hour: "2-digit",
                                  minute:
                                    "2-digit",
                                }
                              )
                            : ""}
                        </span>
                      </div>
                    </button>
                  )
                )
              )}
            </div>
          </div>
        </section>
      </main>
    </StaffGuard>
  );
}
