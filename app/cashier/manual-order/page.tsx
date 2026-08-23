"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type MenuItem = {
  id: number;
  name: string;
  category: string;
  price: number;
  station: "kitchen" | "pizza" | "bar";
};

type CartItem = MenuItem & {
  quantity: number;
};

const categories = [
  "All",
  "Starters",
  "Main Course",
  "Pizza",
  "Burgers",
  "Drinks",
  "Smoothies",
  "Desserts",
];

const menu: MenuItem[] = [
  {
    id: 1,
    name: "Chicken Karahi",
    category: "Main Course",
    price: 15.9,
    station: "kitchen",
  },
  {
    id: 2,
    name: "Bruschetta",
    category: "Starters",
    price: 6.5,
    station: "kitchen",
  },
  {
    id: 3,
    name: "Pasta Alfredo",
    category: "Main Course",
    price: 8.9,
    station: "kitchen",
  },
  {
    id: 4,
    name: "Beef Burger",
    category: "Burgers",
    price: 9.9,
    station: "kitchen",
  },
  {
    id: 5,
    name: "Margherita Pizza",
    category: "Pizza",
    price: 11.9,
    station: "pizza",
  },
  {
    id: 6,
    name: "Coca-Cola",
    category: "Drinks",
    price: 2.5,
    station: "bar",
  },
  {
    id: 7,
    name: "Mineral Water",
    category: "Drinks",
    price: 3,
    station: "bar",
  },
  {
    id: 8,
    name: "Mango Smoothie",
    category: "Smoothies",
    price: 6.5,
    station: "bar",
  },
  {
    id: 9,
    name: "Chocolate Cake",
    category: "Desserts",
    price: 7.5,
    station: "kitchen",
  },
];

export default function ManualOrderPage() {
  const router = useRouter();

  const [tableNumber, setTableNumber] = useState("");
  const [guestName, setGuestName] = useState("Walk-in");

  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");

  const [cart, setCart] = useState<CartItem[]>([]);

  const filteredMenu = menu.filter((item) => {
    const categoryMatch =
      category === "All" || item.category === category;

    const searchMatch = item.name
      .toLowerCase()
      .includes(search.toLowerCase());

    return categoryMatch && searchMatch;
  });

  const total = useMemo(() => {
    return cart.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
  }, [cart]);

  const addItem = (item: MenuItem) => {
    const existing = cart.find(
      (cartItem) => cartItem.id === item.id
    );

    if (existing) {
      setCart((current) =>
        current.map((cartItem) =>
          cartItem.id === item.id
            ? {
                ...cartItem,
                quantity: cartItem.quantity + 1,
              }
            : cartItem
        )
      );

      return;
    }

    setCart((current) => [
      ...current,
      {
        ...item,
        quantity: 1,
      },
    ]);
  };

  const increaseItem = (itemId: number) => {
    setCart((current) =>
      current.map((item) =>
        item.id === itemId
          ? {
              ...item,
              quantity: item.quantity + 1,
            }
          : item
      )
    );
  };

  const decreaseItem = (itemId: number) => {
    setCart((current) =>
      current
        .map((item) =>
          item.id === itemId
            ? {
                ...item,
                quantity: item.quantity - 1,
              }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const removeItem = (itemId: number) => {
    setCart((current) =>
      current.filter((item) => item.id !== itemId)
    );
  };

  const saveOrder = () => {
    if (!tableNumber.trim()) {
      alert("Please enter a table number.");
      return;
    }

    if (!guestName.trim()) {
      alert("Please enter a guest name.");
      return;
    }

    if (cart.length === 0) {
      alert("Please add at least one item.");
      return;
    }

    const orderId = Date.now();

    const newOrder = {
      id: orderId,
      orderNumber: String(orderId).slice(-5),
      tableNumber: tableNumber.trim(),
      serviceType: "dine-in",
      language: "en",
      createdAt: Date.now(),
      status: "new",
      paymentStatus: "unpaid",

      guests: [
        {
          guestName: guestName.trim(),

          items: cart.map((item) => ({
            id: item.id,
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            station: item.station,
            done: false,
          })),
        },
      ],

      total,
      manualOrder: true,
    };

    const existingOrders = JSON.parse(
      localStorage.getItem("dinevo-orders") || "[]"
    );

    localStorage.setItem(
      "dinevo-orders",
      JSON.stringify([...existingOrders, newOrder])
    );

    router.push("/cashier");
  };

  return (
    <main className="min-h-screen bg-[#0d0f10] text-white">

      {/* HEADER */}

      <header className="flex items-center justify-between border-b border-white/10 px-6 py-4">

        <div>
          <h1 className="text-3xl font-black">
            DINE
            <span className="text-red-500">VO</span>
          </h1>

          <p className="text-sm text-gray-400">
            Manual Cashier Order
          </p>
        </div>

        <button
          onClick={() => router.push("/cashier")}
          className="rounded-xl border border-white/10 bg-[#171a1d] px-5 py-3 font-bold"
        >
          ← Back to Cashier
        </button>

      </header>

      {/* CUSTOMER DETAILS */}

      <section className="grid grid-cols-2 gap-4 border-b border-white/10 bg-[#131619] p-5">

        <div>
          <label className="text-sm text-gray-400">
            Table Number
          </label>

          <input
            value={tableNumber}
            onChange={(e) =>
              setTableNumber(e.target.value)
            }
            placeholder="Example: 10"
            className="mt-2 w-full rounded-xl border border-white/10 bg-[#1a1e21] px-4 py-3 outline-none"
          />
        </div>

        <div>
          <label className="text-sm text-gray-400">
            Guest Name
          </label>

          <input
            value={guestName}
            onChange={(e) =>
              setGuestName(e.target.value)
            }
            placeholder="Guest name"
            className="mt-2 w-full rounded-xl border border-white/10 bg-[#1a1e21] px-4 py-3 outline-none"
          />
        </div>

      </section>

      {/* MAIN */}

      <section className="grid grid-cols-[190px_minmax(0,1fr)_320px] gap-4 p-4">

        {/* CATEGORIES */}

        <aside className="rounded-2xl border border-white/10 bg-[#131619] p-4">

          <h2 className="mb-4 font-black">
            CATEGORIES
          </h2>

          <div className="space-y-2">

            {categories.map((item) => (

              <button
                key={item}
                onClick={() => setCategory(item)}
                className={`w-full rounded-xl px-4 py-3 text-left text-sm font-bold ${
                  category === item
                    ? "bg-red-600"
                    : "bg-[#1a1e21]"
                }`}
              >
                {item}
              </button>

            ))}

          </div>

        </aside>

        {/* DISHES */}

        <section>

          <input
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            placeholder="Search dishes..."
            className="mb-4 w-full rounded-xl border border-white/10 bg-[#171a1d] px-5 py-3 outline-none"
          />

          <div className="grid grid-cols-2 gap-4 xl:grid-cols-3">

            {filteredMenu.map((item) => (

              <div
                key={item.id}
                className="rounded-2xl border border-white/10 bg-[#151819] p-5"
              >

                <p className="text-xs uppercase text-gray-500">
                  {item.category}
                </p>

                <h3 className="mt-2 text-lg font-bold">
                  {item.name}
                </h3>

                <div className="mt-5 flex items-center justify-between">

                  <strong className="text-xl text-red-500">
                    €{item.price.toFixed(2)}
                  </strong>

                  <button
                    onClick={() => addItem(item)}
                    className="rounded-xl bg-red-600 px-4 py-2 font-black"
                  >
                    + Add
                  </button>

                </div>

              </div>

            ))}

          </div>

        </section>

        {/* ORDER PANEL */}

        <aside className="rounded-2xl border border-white/10 bg-[#131619] p-5">

          <h2 className="text-xl font-black">
            CURRENT ORDER
          </h2>

          <p className="mt-1 text-sm text-gray-400">
            {guestName || "Guest"}
          </p>

          <div className="mt-5 space-y-4">

            {cart.length === 0 ? (

              <div className="rounded-xl bg-[#1a1e21] p-5 text-sm text-gray-500">
                No items added yet.
              </div>

            ) : (

              cart.map((item) => (

                <div
                  key={item.id}
                  className="border-b border-white/10 pb-4"
                >

                  <div className="flex justify-between gap-3">

                    <div>

                      <p className="font-bold">
                        {item.name}
                      </p>

                      <p className="mt-1 text-sm text-gray-400">
                        €{item.price.toFixed(2)}
                      </p>

                    </div>

                    <button
                      onClick={() =>
                        removeItem(item.id)
                      }
                      className="text-xs font-bold text-red-500"
                    >
                      Remove
                    </button>

                  </div>

                  <div className="mt-3 flex items-center justify-between">

                    <div className="flex items-center rounded-lg border border-white/10">

                      <button
                        onClick={() =>
                          decreaseItem(item.id)
                        }
                        className="px-3 py-2"
                      >
                        −
                      </button>

                      <span className="px-2 font-bold">
                        {item.quantity}
                      </span>

                      <button
                        onClick={() =>
                          increaseItem(item.id)
                        }
                        className="px-3 py-2"
                      >
                        +
                      </button>

                    </div>

                    <strong>
                      €
                      {(
                        item.price * item.quantity
                      ).toFixed(2)}
                    </strong>

                  </div>

                </div>

              ))

            )}

          </div>

          <div className="mt-6 flex justify-between border-t border-white/10 pt-5">

            <span className="text-lg font-bold">
              TOTAL
            </span>

            <strong className="text-3xl text-green-500">
              €{total.toFixed(2)}
            </strong>

          </div>

          <button
            onClick={saveOrder}
            disabled={cart.length === 0}
            className="mt-6 w-full rounded-xl bg-green-600 py-4 font-black hover:bg-green-700 disabled:bg-gray-700"
          >
            SAVE ORDER
          </button>

        </aside>

      </section>

    </main>
  );
}