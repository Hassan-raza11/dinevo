"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type MenuItem = {
  id: number;
  name: string;
  category: string;
  price: number;
  description: string;
  image: string;
  vegetarian?: boolean;
  active?: boolean;
};

type CartItem = MenuItem & {
  quantity: number;
};

type RestaurantSettings = {
  restaurantName: string;
  currencySymbol: string;
};

const defaultSettings: RestaurantSettings = {
  restaurantName: "Dinevo Restaurant",
  currencySymbol: "€",
};


const fallbackImages: Record<string, string> = {
  "Chicken Karahi":
    "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=800&q=80",
  Bruschetta:
    "https://images.unsplash.com/photo-1572695157366-5e585ab2b69f?auto=format&fit=crop&w=800&q=80",
  "Pasta Alfredo":
    "https://images.unsplash.com/photo-1645112411341-6c4fd023714a?auto=format&fit=crop&w=800&q=80",
  "Beef Burger":
    "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80",
  "Margherita Pizza":
    "https://images.unsplash.com/photo-1574071318508-1cdbab80d00288?auto=format&fit=crop&w=800&q=80",
  "Grilled Salmon":
    "https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=800&q=80",
  "Coca-Cola":
    "https://images.unsplash.com/photo-1629203851122-3726ecdf080e?auto=format&fit=crop&w=800&q=80",
  "Mineral Water":
    "https://images.unsplash.com/photo-1564419320461-6870880221ad?auto=format&fit=crop&w=800&q=80",
  "Mango Smoothie":
    "https://images.unsplash.com/photo-1623065422902-30a2d299bbe4?auto=format&fit=crop&w=800&q=80",
  "Chocolate Cake":
    "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=800&q=80",
};

export default function QRMenuPage() {
  const [settings, setSettings] =
    useState<RestaurantSettings>(defaultSettings);

  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] =
    useState<string[]>(["All Dishes"]);

  const [category, setCategory] = useState("All Dishes");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [infoItem, setInfoItem] = useState<MenuItem | null>(null);
  const [showSelection, setShowSelection] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSettings = async () => {
      const { data, error } = await supabase
        .from("restaurant_settings")
        .select("restaurant_name, currency_symbol")
        .eq("id", 1)
        .single();

      if (!error && data) {
        setSettings({
          restaurantName:
            data.restaurant_name ||
            defaultSettings.restaurantName,
          currencySymbol:
            data.currency_symbol ||
            defaultSettings.currencySymbol,
        });
      }
    };

    const loadMenu = async () => {
      const { data: categoryData } = await supabase
        .from("menu_categories")
        .select("name, display_order, active")
        .eq("active", true)
        .order("display_order", { ascending: true });

      if (categoryData) {
        setCategories([
          "All Dishes",
          ...categoryData.map((item: any) => item.name),
        ]);
      }

      const { data, error } = await supabase
        .from("menu_items")
        .select(`
          id,
          name,
          description,
          price,
          image_url,
          vegetarian,
          display_order,
          active,
          menu_categories (
            name
          )
        `)
        .order("display_order", { ascending: true });

      if (error) {
        console.error("QR menu load error:", error);
        setLoading(false);
        return;
      }

      const mapped: MenuItem[] = (data || []).map((item: any) => ({
        id: Number(item.id),
        name: item.name,
        category: item.menu_categories?.name || "Other",
        price: Number(item.price),
        description: item.description || "",
        image:
          item.image_url ||
          fallbackImages[item.name] ||
          "",
        vegetarian: Boolean(item.vegetarian),
        active: Boolean(item.active),
      }));

      setMenuItems(mapped);

      const availableIds = new Set(
        mapped
          .filter((item) => item.active !== false)
          .map((item) => item.id)
      );

      setCart((current) =>
        current.filter((item) => availableIds.has(item.id))
      );

      setLoading(false);
    };

    loadSettings();
    loadMenu();

    const interval = setInterval(() => {
      loadSettings();
      loadMenu();
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const filteredMenu = useMemo(() => {
    const q = search.trim().toLowerCase();

    return menuItems.filter((item) => {
      const categoryMatches =
        category === "All Dishes" ||
        item.category === category;

      const searchMatches =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q);

      return categoryMatches && searchMatches;
    });
  }, [menuItems, category, search]);

  const total = useMemo(
    () =>
      cart.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      ),
    [cart]
  );

  const itemCount = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart]
  );

  const addItem = async (item: MenuItem) => {
    const { data, error } = await supabase
      .from("menu_items")
      .select("id, active")
      .eq("id", item.id)
      .single();

    if (error || !data || data.active !== true) {
      alert(`${item.name} is currently sold out.`);
      setMenuItems((current) =>
        current.map((dish) =>
          dish.id === item.id
            ? { ...dish, active: false }
            : dish
        )
      );
      return;
    }

    setCart((current) => {
      const existing = current.find(
        (cartItem) => cartItem.id === item.id
      );

      if (existing) {
        return current.map((cartItem) =>
          cartItem.id === item.id
            ? {
                ...cartItem,
                quantity: cartItem.quantity + 1,
              }
            : cartItem
        );
      }

      return [...current, { ...item, quantity: 1 }];
    });
  };

  const decreaseItem = (itemId: number) => {
    setCart((current) =>
      current
        .map((item) =>
          item.id === itemId
            ? { ...item, quantity: item.quantity - 1 }
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

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f5f5f5] pb-32 sm:pb-28">
      <header className="sticky top-0 z-40 bg-black px-3 py-3 text-white shadow-lg sm:px-4 sm:py-4">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 sm:flex-nowrap sm:gap-4">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-black sm:text-2xl">
              {settings.restaurantName}
            </h1>
            <p className="text-[10px] text-gray-400">
              Powered by DINEVO
            </p>
          </div>

          <div className="shrink-0 rounded-full border border-white/20 bg-white/10 px-2.5 py-2 text-[10px] font-black sm:px-3 sm:text-xs">
            QR MENU · PREVIEW ONLY
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-3 py-4 sm:px-4 sm:py-5">
        <div className="mb-4 rounded-2xl border border-red-100 bg-red-50 p-3 sm:mb-5 sm:p-4">
          <p className="font-black text-red-700">
            Build your selection while you wait
          </p>
          <p className="mt-1 text-sm text-red-700/80">
            This is a preview list only. Nothing selected here is
            sent to the kitchen or restaurant staff.
          </p>
        </div>

        <div className="mb-4">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search dishes..."
            className="min-h-12 w-full rounded-2xl border bg-white px-4 py-3 outline-none focus:border-red-600"
          />
        </div>

        <div className="mb-4 flex snap-x gap-2 overflow-x-auto pb-2 sm:mb-5">
          {categories.map((item) => (
            <button
              key={item}
              onClick={() => setCategory(item)}
              className={`min-h-10 shrink-0 snap-start rounded-full px-4 py-2 text-sm font-bold ${
                category === item
                  ? "bg-red-600 text-white"
                  : "border bg-white text-gray-700"
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="py-20 text-center font-bold text-gray-400">
            Loading menu...
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 min-[390px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
            {filteredMenu.map((item) => (
              <article
                key={item.id}
                className={`relative overflow-hidden rounded-2xl border bg-white shadow-sm ${
                  item.active === false ? "opacity-70" : ""
                }`}
              >
                {item.active === false && (
                  <div className="absolute left-2 top-2 z-10 rounded-full bg-red-600 px-3 py-1 text-[10px] font-black text-white">
                    SOLD OUT
                  </div>
                )}

                <div className="aspect-[4/3] bg-gray-100">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.name}
                      className={`h-full w-full object-cover ${
                        item.active === false ? "grayscale" : ""
                      }`}
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-gray-400">
                      No image
                    </div>
                  )}
                </div>

                <div className="p-3 sm:p-3">
                  <h2 className="truncate text-sm font-black">
                    {item.name}
                  </h2>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 gap-2">
                    <strong className="text-sm text-red-600">
                      {settings.currencySymbol}
                      {item.price.toFixed(2)}
                    </strong>

                    <div className="flex gap-2">
                      <button
                        onClick={() => setInfoItem(item)}
                        className="flex h-10 w-10 items-center justify-center rounded-full border font-serif font-black text-gray-600 sm:h-9 sm:w-9"
                      >
                        i
                      </button>

                      <button
                        onClick={() => addItem(item)}
                        disabled={item.active === false}
                        className="flex h-10 w-10 items-center justify-center rounded-full bg-red-600 text-lg font-black text-white disabled:cursor-not-allowed disabled:bg-gray-300 sm:h-9 sm:w-9"
                      >
                        {item.active === false ? "×" : "+"}
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-white p-3 shadow-[0_-8px_25px_rgba(0,0,0,0.08)]">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 min-[390px]:flex-row min-[390px]:items-center sm:gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-gray-500">
              Your preview selection
            </p>
            <p className="font-black">
              {itemCount} {itemCount === 1 ? "item" : "items"} ·{" "}
              <span className="text-red-600">
                {settings.currencySymbol}
                {total.toFixed(2)}
              </span>
            </p>
          </div>

          <button
            onClick={() => setShowSelection(true)}
            disabled={cart.length === 0}
            className="min-h-12 w-full rounded-xl bg-black px-5 py-3 text-sm font-black text-white disabled:bg-gray-300 min-[390px]:w-auto"
          >
            View Selection
          </button>
        </div>
      </div>

      {infoItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-2 sm:p-4">
          <div className="max-h-[95vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white sm:rounded-3xl">
            {infoItem.image && (
              <img
                src={infoItem.image}
                alt={infoItem.name}
                className="h-44 w-full object-cover sm:h-56"
              />
            )}

            <div className="p-4 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3 sm:gap-4">
                <h2 className="text-xl font-black sm:text-2xl">
                  {infoItem.name}
                </h2>
                <strong className="shrink-0 text-xl text-red-600">
                  {settings.currencySymbol}
                  {infoItem.price.toFixed(2)}
                </strong>
              </div>

              <p className="mt-4 leading-7 text-gray-500">
                {infoItem.description}
              </p>

              {infoItem.vegetarian && (
                <p className="mt-4 text-sm font-black text-green-600">
                  ● Vegetarian
                </p>
              )}

              {infoItem.active === false && (
                <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-black text-red-600">
                  SOLD OUT
                </p>
              )}

              <button
                onClick={() => setInfoItem(null)}
                className="mt-6 w-full rounded-xl bg-black py-3 font-black text-white"
              >
                Back to Menu
              </button>
            </div>
          </div>
        </div>
      )}

      {showSelection && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-3">
          <div className="max-h-[94vh] w-full overflow-y-auto rounded-t-3xl bg-white p-4 sm:max-w-xl sm:rounded-3xl sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-red-600">
                  Preview only
                </p>
                <h2 className="text-xl font-black sm:text-2xl">
                  Your Selection
                </h2>
              </div>

              <button
                onClick={() => setShowSelection(false)}
                className="rounded-xl bg-gray-100 px-4 py-3 font-black"
              >
                ✕
              </button>
            </div>

            <div className="mt-5 space-y-3">
              {cart.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-black">
                        {item.name}
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">
                        {settings.currencySymbol}
                        {item.price.toFixed(2)} each
                      </p>
                    </div>

                    <strong className="shrink-0">
                      {settings.currencySymbol}
                      {(item.price * item.quantity).toFixed(2)}
                    </strong>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center rounded-xl border">
                      <button
                        onClick={() => decreaseItem(item.id)}
                        className="min-h-11 min-w-11 px-4 py-2 font-black"
                      >
                        −
                      </button>
                      <span className="px-2 font-black">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => addItem(item)}
                        className="min-h-11 min-w-11 px-4 py-2 font-black"
                      >
                        +
                      </button>
                    </div>

                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-sm font-black text-red-600"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-black p-4 text-white sm:p-5">
              <span className="font-bold">
                Estimated Total
              </span>
              <strong className="text-2xl text-red-500">
                {settings.currencySymbol}
                {total.toFixed(2)}
              </strong>
            </div>

            <div className="mt-4 rounded-2xl bg-red-50 p-4 text-center text-sm font-bold text-red-700">
              This selection is not an order. Please use the
              restaurant tablet to place your final order.
            </div>

            <button
              onClick={() => setShowSelection(false)}
              className="mt-4 min-h-12 w-full rounded-xl bg-red-600 py-3 font-black text-white"
            >
              Continue Browsing
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
