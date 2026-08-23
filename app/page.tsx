"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type MenuItem = {
  id: number;
  name: string;
  category: string;
  price: number;
  description: string;
  image: string;
  vegetarian?: boolean;
};

type CartItem = MenuItem & {
  quantity: number;
};

const categories = [
  "All Dishes",
  "Restaurant Special",
  "Starters",
  "Main Course",
  "Pasta",
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
    description:
      "Traditional chicken karahi cooked with tomato, ginger, garlic and fresh spices.",
    image:
      "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=800&q=80",
  },

  {
    id: 2,
    name: "Bruschetta",
    category: "Starters",
    price: 6.5,
    description:
      "Grilled bread topped with tomatoes, garlic, olive oil and fresh herbs.",
    image:
      "https://images.unsplash.com/photo-1572695157366-5e585ab2b69f?auto=format&fit=crop&w=800&q=80",
    vegetarian: true,
  },

  {
    id: 3,
    name: "Pasta Alfredo",
    category: "Pasta",
    price: 8.9,
    description:
      "Creamy Alfredo pasta finished with parmesan cheese and herbs.",
    image:
      "https://images.unsplash.com/photo-1645112411341-6c4fd023714a?auto=format&fit=crop&w=800&q=80",
    vegetarian: true,
  },

  {
    id: 4,
    name: "Beef Burger",
    category: "Burgers",
    price: 9.9,
    description:
      "Grilled beef patty with cheese, lettuce, tomato and house sauce.",
    image:
      "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80",
  },

  {
    id: 5,
    name: "Margherita Pizza",
    category: "Pizza",
    price: 11.9,
    description:
      "Classic pizza with tomato sauce, mozzarella and fresh basil.",
    image:
      "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=800&q=80",
    vegetarian: true,
  },

  {
    id: 6,
    name: "Grilled Salmon",
    category: "Restaurant Special",
    price: 16.9,
    description:
      "Fresh salmon grilled with herbs and served with seasonal vegetables.",
    image:
      "https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=800&q=80",
  },

  {
    id: 7,
    name: "Coca-Cola",
    category: "Drinks",
    price: 2.5,
    description:
      "Ice-cold classic Coca-Cola.",
    image:
      "https://images.unsplash.com/photo-1629203851122-3726ecdf080e?auto=format&fit=crop&w=800&q=80",
  },

  {
    id: 8,
    name: "Mineral Water",
    category: "Drinks",
    price: 3.0,
    description:
      "Refreshing chilled mineral water.",
    image:
      "https://images.unsplash.com/photo-1564419320461-6870880221ad?auto=format&fit=crop&w=800&q=80",
  },

  {
    id: 9,
    name: "Mango Smoothie",
    category: "Smoothies",
    price: 6.5,
    description:
      "Fresh mango blended into a smooth and refreshing drink.",
    image:
      "https://images.unsplash.com/photo-1623065422902-30a2d299bbe4?auto=format&fit=crop&w=800&q=80",
  },

  {
    id: 10,
    name: "Chocolate Cake",
    category: "Desserts",
    price: 7.5,
    description:
      "Rich chocolate cake with a soft chocolate center.",
    image:
      "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=800&q=80",
    vegetarian: true,
  },
];

export default function Home() {
  const router = useRouter();

  const [tableNumber, setTableNumber] = useState("");
  const [serviceType, setServiceType] = useState("");
  const [language, setLanguage] = useState("en");

  const [category, setCategory] = useState("All Dishes");
  const [search, setSearch] = useState("");

  const [people, setPeople] = useState<string[]>([]);
  const [selectedPerson, setSelectedPerson] =
    useState<number | null>(null);

  const [newGuestName, setNewGuestName] = useState("");
  const [showGuestInput, setShowGuestInput] = useState(false);

  const [orders, setOrders] =
    useState<Record<number, CartItem[]>>({});

  const [showTableOrder, setShowTableOrder] = useState(false);

  const [viewingGuestOrder, setViewingGuestOrder] =
    useState<number | null>(null);

  const [infoItem, setInfoItem] =
    useState<MenuItem | null>(null);

  useEffect(() => {
    const savedTable =
      localStorage.getItem("dinevo-table-number");

    const savedService =
      localStorage.getItem("dinevo-service-type");

    const savedLanguage =
      localStorage.getItem("dinevo-language");

    if (savedTable) setTableNumber(savedTable);
    if (savedService) setServiceType(savedService);
    if (savedLanguage) setLanguage(savedLanguage);
  }, []);

  const addGuest = () => {
    const name = newGuestName.trim();

    if (!name) return;

    const newIndex = people.length;

    setPeople((current) => [...current, name]);

    setOrders((current) => ({
      ...current,
      [newIndex]: [],
    }));

    setSelectedPerson(newIndex);
    setNewGuestName("");
    setShowGuestInput(false);
  };

  const addItem = (item: MenuItem) => {
    if (selectedPerson === null) return;

    const currentOrder =
      orders[selectedPerson] || [];

    const existingItem =
      currentOrder.find(
        (cartItem) => cartItem.id === item.id
      );

    let updatedOrder: CartItem[];

    if (existingItem) {
      updatedOrder = currentOrder.map((cartItem) =>
        cartItem.id === item.id
          ? {
              ...cartItem,
              quantity: cartItem.quantity + 1,
            }
          : cartItem
      );
    } else {
      updatedOrder = [
        ...currentOrder,
        {
          ...item,
          quantity: 1,
        },
      ];
    }

    setOrders((current) => ({
      ...current,
      [selectedPerson]: updatedOrder,
    }));
  };

  const increaseQuantity = (
    personIndex: number,
    itemId: number
  ) => {
    const currentOrder =
      orders[personIndex] || [];

    setOrders((current) => ({
      ...current,
      [personIndex]: currentOrder.map((item) =>
        item.id === itemId
          ? {
              ...item,
              quantity: item.quantity + 1,
            }
          : item
      ),
    }));
  };

  const decreaseQuantity = (
    personIndex: number,
    itemId: number
  ) => {
    const currentOrder =
      orders[personIndex] || [];

    const updatedOrder =
      currentOrder
        .map((item) =>
          item.id === itemId
            ? {
                ...item,
                quantity: item.quantity - 1,
              }
            : item
        )
        .filter((item) => item.quantity > 0);

    setOrders((current) => ({
      ...current,
      [personIndex]: updatedOrder,
    }));
  };

  const removeItem = (
    personIndex: number,
    itemId: number
  ) => {
    setOrders((current) => ({
      ...current,
      [personIndex]: (
        current[personIndex] || []
      ).filter((item) => item.id !== itemId),
    }));
  };

  const tableTotal = useMemo(() => {
    return Object.values(orders)
      .flat()
      .reduce(
        (total, item) =>
          total + item.price * item.quantity,
        0
      );
  }, [orders]);

  const filteredMenu =
    menu.filter((item) => {
      const categoryMatches =
        category === "All Dishes" ||
        item.category === category;

      const searchMatches =
        item.name
          .toLowerCase()
          .includes(search.toLowerCase()) ||
        item.description
          .toLowerCase()
          .includes(search.toLowerCase());

      return categoryMatches && searchMatches;
    });

  const confirmOrder = () => {
  if (tableTotal === 0) return;

  const kitchenOrder = {
    id: Date.now(),
    orderNumber: String(Date.now()).slice(-5),
    tableNumber,
    serviceType,
    language,
    createdAt: Date.now(),
    status: "new",

    guests: people.map((person, personIndex) => ({
      guestName: person,

      items: (orders[personIndex] || []).map((item) => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        price: item.price,

        // For now we will route all normal dishes to kitchen.
        // Later we will change this item-by-item.
        station:
          item.category === "Pizza"
            ? "pizza"
            : item.category === "Drinks" ||
              item.category === "Smoothies"
            ? "bar"
            : "kitchen",

        done: false,
      })),
    })),

    total: tableTotal,
  };

  // Get any previous restaurant orders
  const existingOrders = JSON.parse(
    localStorage.getItem("dinevo-orders") || "[]"
  );

  // Add this new order
  const updatedOrders = [
    ...existingOrders,
    kitchenOrder,
  ];

  // Save all orders
  localStorage.setItem(
    "dinevo-orders",
    JSON.stringify(updatedOrders)
  );

  // Keep this because the thank-you page currently reads it
  localStorage.setItem(
    "dinevo-confirmed-order",
    JSON.stringify(kitchenOrder)
  );

  router.push("/thank-you");
};

    

  return (
    <main className="min-h-screen bg-[#f5f5f5]">

      {/* HEADER */}

      <header className="flex h-20 items-center justify-between bg-black px-7 text-white">

        <div>

          <h1 className="text-3xl font-black">
            <span className="text-red-600">
              D
            </span>
            INEVO
          </h1>

          <p className="text-[10px] text-gray-400">
            From Table to Kitchen, Seamlessly.
          </p>

        </div>

        <div className="flex gap-10 text-lg font-bold">

          <span>
            Table {tableNumber || "—"}
          </span>

          <span>
            {serviceType === "takeaway"
              ? "Take Away"
              : "Dine In"}
          </span>

        </div>

        <div className="rounded-xl border border-white/20 px-4 py-2">

          {language === "fr"
            ? "🇫🇷 Français"
            : language === "es"
            ? "🇪🇸 Español"
            : language === "de"
            ? "🇩🇪 Deutsch"
            : language === "it"
            ? "🇮🇹 Italiano"
            : language === "ar"
            ? "🇸🇦 العربية"
            : "🇬🇧 English"}

        </div>

      </header>

      {/* MAIN */}

      <div className="grid min-h-[calc(100vh-80px)] grid-cols-[190px_minmax(0,1fr)_170px]">

        {/* LEFT MENU */}

        <aside className="bg-[#111214] p-3 text-white">

          <h2 className="mb-4 px-2 text-sm font-bold">
            MENU
          </h2>

          <div className="space-y-2">

            {categories.map((item) => (

              <button
                key={item}
                onClick={() => setCategory(item)}
                className={`w-full rounded-lg px-3 py-3 text-left text-xs font-semibold ${
                  category === item
                    ? "bg-red-600"
                    : "bg-[#222326] hover:bg-[#303135]"
                }`}
              >
                {item}
              </button>

            ))}

          </div>

        </aside>

        {/* CENTER */}

        <section className="p-5">

          {viewingGuestOrder === null ? (

            <>

              {/* TOP BAR */}

              <div className="mb-5 flex items-center gap-3">

                

                {!showGuestInput && (

                  <button
                    onClick={() =>
                      setShowGuestInput(true)
                    }
                    className="rounded-xl bg-black px-5 py-3 font-bold text-white"
                  >
                    + Guest
                  </button>

                )}

              </div>

              {showGuestInput && (

                <div className="mb-5 flex gap-2">

                  <input
                    value={newGuestName}
                    onChange={(e) =>
                      setNewGuestName(
                        e.target.value
                      )
                    }
                    placeholder="Guest name"
                    className="rounded-xl border px-4 py-3"
                  />

                  <button
                    onClick={addGuest}
                    className="rounded-xl bg-red-600 px-5 font-bold text-white"
                  >
                    Add
                  </button>

                  <button
                    onClick={() =>
                      setShowGuestInput(false)
                    }
                    className="rounded-xl bg-gray-200 px-4"
                  >
                    Cancel
                  </button>

                </div>

              )}

              {selectedPerson === null && (

                <div className="mb-5 rounded-xl bg-red-50 p-3 text-sm text-red-700">
                  Please select or add a guest before adding food.
                </div>

              )}

              {/* FOOD GRID */}

              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">

                {filteredMenu.map((item) => (

                  <article
                    key={item.id}
                    className="overflow-hidden rounded-xl border bg-white shadow-sm"
                  >

                    <img
                      src={item.image}
                      alt={item.name}
                      className="h-32 w-full object-cover"
                    />

                    <div className="p-3">

                      <h3 className="truncate text-sm font-bold">
                        {item.name}
                      </h3>

                      <div className="mt-3 flex items-center justify-between">

                        <strong className="text-sm text-red-600">
                          €{item.price.toFixed(2)}
                        </strong>

                        <div className="flex gap-2">

                          {/* INFORMATION */}

                          <button
                            onClick={() =>
                              setInfoItem(item)
                            }
                            className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 font-serif font-bold text-gray-600 hover:bg-gray-100"
                          >
                            i
                          </button>

                          {/* ADD */}

                          <button
                            onClick={() =>
                              addItem(item)
                            }
                            disabled={
                              selectedPerson === null
                            }
                            className="flex h-8 w-8 items-center justify-center rounded-full bg-red-600 text-lg font-bold text-white disabled:bg-gray-300"
                          >
                            +
                          </button>

                        </div>

                      </div>

                    </div>

                  </article>

                ))}

              </div>

            </>

          ) : (

            /* GUEST ORDER VIEW */

            <GuestOrderView
              guestName={
                people[viewingGuestOrder]
              }
              order={
                orders[viewingGuestOrder] || []
              }
              personIndex={
                viewingGuestOrder
              }
              onIncrease={increaseQuantity}
              onDecrease={decreaseQuantity}
              onRemove={removeItem}
              onBack={() =>
                setViewingGuestOrder(null)
              }
            />

          )}

        </section>

        {/* RIGHT GUESTS */}

        <aside className="bg-[#111214] p-3 text-white">

          <h2 className="mb-4 text-sm font-bold">
            GUESTS
          </h2>

          <div className="space-y-2">

            {people.map((person, index) => {

              const count =
                (
                  orders[index] || []
                ).reduce(
                  (total, item) =>
                    total + item.quantity,
                  0
                );

              return (

                <button
                  key={`${person}-${index}`}
                  onClick={() => {
                    setSelectedPerson(index);
                    setViewingGuestOrder(index);
                  }}
                  className={`w-full rounded-lg px-3 py-3 text-left ${
                    selectedPerson === index
                      ? "bg-red-600"
                      : "bg-[#232427]"
                  }`}
                >

                  <p className="text-sm font-bold">
                    {person}
                  </p>

                  <p className="mt-1 text-[10px] text-gray-400">
                    {count} items
                  </p>

                </button>

              );
            })}

          </div>

          <button
            onClick={() =>
              setShowGuestInput(true)
            }
            className="mt-3 w-full rounded-lg border border-dashed border-gray-600 py-3 text-xs"
          >
            + Add Guest
          </button>

          <div className="mt-6 border-t border-white/10 pt-4">

            <p className="text-xs text-gray-500">
              Table Total
            </p>

            <p className="mt-1 text-xl font-black text-red-500">
              €{tableTotal.toFixed(2)}
            </p>

          </div>

          <button
            onClick={() =>
              setShowTableOrder(true)
            }
            disabled={tableTotal === 0}
            className="mt-5 w-full rounded-lg border border-white/20 py-3 text-xs font-bold disabled:opacity-30"
          >
            Table Order
          </button>

          <button
            onClick={confirmOrder}
            disabled={tableTotal === 0}
            className="mt-2 w-full rounded-lg bg-red-600 py-3 text-xs font-bold disabled:bg-gray-700"
          >
            Confirm Order
          </button>

        </aside>

      </div>

      {/* INFORMATION MODAL */}

      {infoItem && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6">

          <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white">

            <img
              src={infoItem.image}
              alt={infoItem.name}
              className="h-56 w-full object-cover"
            />

            <div className="p-6">

              <div className="flex justify-between">

                <h2 className="text-2xl font-bold">
                  {infoItem.name}
                </h2>

                <strong className="text-xl text-red-600">
                  €{infoItem.price.toFixed(2)}
                </strong>

              </div>

              <p className="mt-4 leading-7 text-gray-500">
                {infoItem.description}
              </p>

              {infoItem.vegetarian && (

                <p className="mt-4 text-sm font-bold text-green-600">
                  ● Vegetarian
                </p>

              )}

              <button
                onClick={() =>
                  setInfoItem(null)
                }
                className="mt-6 w-full rounded-xl bg-black py-3 font-bold text-white"
              >
                Back to Menu
              </button>

            </div>

          </div>

        </div>

      )}

      {/* TABLE ORDER MODAL */}

      {showTableOrder && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6">

          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-7">

            <div className="flex justify-between">

              <div>

                <p className="text-xs font-bold text-red-600">
                  DINEVO
                </p>

                <h2 className="text-3xl font-bold">
                  Table {tableNumber} Order
                </h2>

              </div>

              <button
                onClick={() =>
                  setShowTableOrder(false)
                }
                className="rounded-xl bg-gray-100 px-4"
              >
                ✕
              </button>

            </div>

            <div className="mt-6 space-y-4">

              {people.map((person, index) => {

                const personOrder =
                  orders[index] || [];

                return (

                  <div
                    key={`${person}-${index}`}
                    className="rounded-xl border p-4"
                  >

                    <h3 className="font-bold">
                      {person}
                    </h3>

                    {personOrder.map((item) => (

                      <div
                        key={item.id}
                        className="mt-3 flex justify-between"
                      >

                        <span>
                          {item.name} × {item.quantity}
                        </span>

                        <strong>
                          €
                          {(
                            item.price *
                            item.quantity
                          ).toFixed(2)}
                        </strong>

                      </div>

                    ))}

                  </div>

                );
              })}

            </div>

            <div className="mt-6 flex justify-between rounded-xl bg-black p-5 text-white">

              <strong>
                Table Total
              </strong>

              <strong className="text-xl text-red-500">
                €{tableTotal.toFixed(2)}
              </strong>

            </div>

            <div className="mt-5 flex gap-3">

              <button
                onClick={() =>
                  setShowTableOrder(false)
                }
                className="flex-1 rounded-xl border py-3 font-bold"
              >
                Back to Menu
              </button>

              <button
                onClick={confirmOrder}
                className="flex-1 rounded-xl bg-red-600 py-3 font-bold text-white"
              >
                Confirm & Send
              </button>

            </div>

          </div>

        </div>

      )}

    </main>
  );
}

type GuestOrderViewProps = {
  guestName: string;
  order: CartItem[];
  personIndex: number;

  onIncrease: (
    personIndex: number,
    itemId: number
  ) => void;

  onDecrease: (
    personIndex: number,
    itemId: number
  ) => void;

  onRemove: (
    personIndex: number,
    itemId: number
  ) => void;

  onBack: () => void;
};

function GuestOrderView({
  guestName,
  order,
  personIndex,
  onIncrease,
  onDecrease,
  onRemove,
  onBack,
}: GuestOrderViewProps) {

  const total =
    order.reduce(
      (sum, item) =>
        sum + item.price * item.quantity,
      0
    );

  return (

    <div className="mx-auto max-w-3xl">

      <div className="mb-6 flex items-center justify-between">

        <div>

          <p className="text-xs font-bold uppercase tracking-wider text-red-600">
            Current Order
          </p>

          <h2 className="text-3xl font-bold">
            {guestName}
          </h2>

        </div>

        <button
          onClick={onBack}
          className="rounded-xl bg-black px-5 py-3 font-bold text-white"
        >
          ← Back to Menu
        </button>

      </div>

      {order.length === 0 ? (

        <div className="rounded-2xl bg-white p-10 text-center text-gray-400">
          No items added yet.
        </div>

      ) : (

        <div className="space-y-3">

          {order.map((item) => (

            <div
              key={item.id}
              className="flex items-center justify-between rounded-xl bg-white p-4 shadow-sm"
            >

              <div>

                <h3 className="font-bold">
                  {item.name}
                </h3>

                <p className="text-sm text-gray-500">
                  €{item.price.toFixed(2)}
                </p>

              </div>

              <div className="flex items-center gap-5">

                <div className="flex items-center rounded-lg border">

                  <button
                    onClick={() =>
                      onDecrease(
                        personIndex,
                        item.id
                      )
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
                      onIncrease(
                        personIndex,
                        item.id
                      )
                    }
                    className="px-3 py-2"
                  >
                    +
                  </button>

                </div>

                <strong>
                  €
                  {(
                    item.price *
                    item.quantity
                  ).toFixed(2)}
                </strong>

                <button
                  onClick={() =>
                    onRemove(
                      personIndex,
                      item.id
                    )
                  }
                  className="text-sm font-bold text-red-600"
                >
                  Remove
                </button>

              </div>

            </div>

          ))}

        </div>

      )}

      <div className="mt-6 flex justify-between rounded-xl bg-black p-5 text-white">

        <strong>
          {guestName} Total
        </strong>

        <strong className="text-2xl text-red-500">
          €{total.toFixed(2)}
        </strong>

      </div>

    </div>

  );
}