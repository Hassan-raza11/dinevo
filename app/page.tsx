"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type MenuItem = {
  id: number;
  name: string;
  category: string;
  price: number;
  description: string;
  image: string;
  vegetarian?: boolean;
  station?: "kitchen" | "pizza" | "bar";
};

type CartItem = MenuItem & {
  quantity: number;
};

const fallbackCategories = [
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

const fallbackMenu: MenuItem[] = [
  {
    id: 1,
    name: "Chicken Karahi",
    category: "Main Course",
    station: "kitchen",
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
    station: "kitchen",
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
    station: "kitchen",
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
    station: "kitchen",
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
    station: "pizza",
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
    station: "kitchen",
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
    station: "bar",
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
    station: "bar",
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
    station: "bar",
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
    station: "kitchen",
    price: 7.5,
    description:
      "Rich chocolate cake with a soft chocolate center.",
    image:
      "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=800&q=80",
    vegetarian: true,
  },
];

const translations = {
  en: {
    table: "Table",
    dineIn: "Dine In",
    takeaway: "Take Away",
    menu: "MENU",
    guests: "GUESTS",

    categories: {
      "All Dishes": "All Dishes",
      "Restaurant Special": "Restaurant Special",
      Starters: "Starters",
      "Main Course": "Main Course",
      Pasta: "Pasta",
      Pizza: "Pizza",
      Burgers: "Burgers",
      Drinks: "Drinks",
      Smoothies: "Smoothies",
      Desserts: "Desserts",
    },

    guest: "+ Guest",
    guestName: "Guest name",
    add: "Add",
    cancel: "Cancel",
    selectGuest:
      "Please select or add a guest before adding food.",

    addGuest: "+ Add Guest",
    item: "item",
    items: "items",

    tableTotal: "Table Total",
    tableOrder: "Table Order",
    confirmOrder: "Confirm Order",

    vegetarian: "Vegetarian",
    backToMenu: "Back to Menu",

    order: "Order",
    confirmSend: "Confirm & Send",

    currentOrder: "Current Order",
    noItems: "No items added yet.",
    remove: "Remove",
    total: "Total",
  },

  fr: {
    table: "Table",
    dineIn: "Sur place",
    takeaway: "À emporter",
    menu: "MENU",
    guests: "CLIENTS",

    categories: {
      "All Dishes": "Tous les plats",
      "Restaurant Special": "Spécialité du restaurant",
      Starters: "Entrées",
      "Main Course": "Plats principaux",
      Pasta: "Pâtes",
      Pizza: "Pizza",
      Burgers: "Burgers",
      Drinks: "Boissons",
      Smoothies: "Smoothies",
      Desserts: "Desserts",
    },

    guest: "+ Client",
    guestName: "Nom du client",
    add: "Ajouter",
    cancel: "Annuler",
    selectGuest:
      "Veuillez sélectionner ou ajouter un client avant d'ajouter des plats.",

    addGuest: "+ Ajouter un client",
    item: "article",
    items: "articles",

    tableTotal: "Total de la table",
    tableOrder: "Commande de la table",
    confirmOrder: "Confirmer la commande",

    vegetarian: "Végétarien",
    backToMenu: "Retour au menu",

    order: "Commande",
    confirmSend: "Confirmer et envoyer",

    currentOrder: "Commande actuelle",
    noItems: "Aucun article ajouté.",
    remove: "Supprimer",
    total: "Total",
  },

  es: {
    table: "Mesa",
    dineIn: "Comer aquí",
    takeaway: "Para llevar",
    menu: "MENÚ",
    guests: "CLIENTES",

    categories: {
      "All Dishes": "Todos los platos",
      "Restaurant Special": "Especialidad del restaurante",
      Starters: "Entrantes",
      "Main Course": "Platos principales",
      Pasta: "Pasta",
      Pizza: "Pizza",
      Burgers: "Hamburguesas",
      Drinks: "Bebidas",
      Smoothies: "Batidos",
      Desserts: "Postres",
    },

    guest: "+ Cliente",
    guestName: "Nombre del cliente",
    add: "Añadir",
    cancel: "Cancelar",
    selectGuest:
      "Seleccione o añada un cliente antes de añadir comida.",

    addGuest: "+ Añadir cliente",
    item: "artículo",
    items: "artículos",

    tableTotal: "Total de la mesa",
    tableOrder: "Pedido de la mesa",
    confirmOrder: "Confirmar pedido",

    vegetarian: "Vegetariano",
    backToMenu: "Volver al menú",

    order: "Pedido",
    confirmSend: "Confirmar y enviar",

    currentOrder: "Pedido actual",
    noItems: "Todavía no hay artículos.",
    remove: "Eliminar",
    total: "Total",
  },

  de: {
    table: "Tisch",
    dineIn: "Vor Ort",
    takeaway: "Zum Mitnehmen",
    menu: "MENÜ",
    guests: "GÄSTE",

    categories: {
      "All Dishes": "Alle Gerichte",
      "Restaurant Special": "Spezialität des Hauses",
      Starters: "Vorspeisen",
      "Main Course": "Hauptgerichte",
      Pasta: "Pasta",
      Pizza: "Pizza",
      Burgers: "Burger",
      Drinks: "Getränke",
      Smoothies: "Smoothies",
      Desserts: "Desserts",
    },

    guest: "+ Gast",
    guestName: "Name des Gastes",
    add: "Hinzufügen",
    cancel: "Abbrechen",
    selectGuest:
      "Bitte wählen oder fügen Sie einen Gast hinzu, bevor Sie Essen hinzufügen.",

    addGuest: "+ Gast hinzufügen",
    item: "Artikel",
    items: "Artikel",

    tableTotal: "Tischsumme",
    tableOrder: "Tischbestellung",
    confirmOrder: "Bestellung bestätigen",

    vegetarian: "Vegetarisch",
    backToMenu: "Zurück zum Menü",

    order: "Bestellung",
    confirmSend: "Bestätigen und senden",

    currentOrder: "Aktuelle Bestellung",
    noItems: "Noch keine Artikel hinzugefügt.",
    remove: "Entfernen",
    total: "Gesamt",
  },

  it: {
    table: "Tavolo",
    dineIn: "Mangia qui",
    takeaway: "Da asporto",
    menu: "MENU",
    guests: "CLIENTI",

    categories: {
      "All Dishes": "Tutti i piatti",
      "Restaurant Special": "Specialità del ristorante",
      Starters: "Antipasti",
      "Main Course": "Piatti principali",
      Pasta: "Pasta",
      Pizza: "Pizza",
      Burgers: "Hamburger",
      Drinks: "Bevande",
      Smoothies: "Frullati",
      Desserts: "Dolci",
    },

    guest: "+ Cliente",
    guestName: "Nome del cliente",
    add: "Aggiungi",
    cancel: "Annulla",
    selectGuest:
      "Seleziona o aggiungi un cliente prima di aggiungere il cibo.",

    addGuest: "+ Aggiungi cliente",
    item: "articolo",
    items: "articoli",

    tableTotal: "Totale tavolo",
    tableOrder: "Ordine del tavolo",
    confirmOrder: "Conferma ordine",

    vegetarian: "Vegetariano",
    backToMenu: "Torna al menu",

    order: "Ordine",
    confirmSend: "Conferma e invia",

    currentOrder: "Ordine attuale",
    noItems: "Nessun articolo aggiunto.",
    remove: "Rimuovi",
    total: "Totale",
  },

  ar: {
    table: "الطاولة",
    dineIn: "تناول الطعام هنا",
    takeaway: "طلب سفري",
    menu: "القائمة",
    guests: "الضيوف",

    categories: {
      "All Dishes": "جميع الأطباق",
      "Restaurant Special": "طبق المطعم المميز",
      Starters: "المقبلات",
      "Main Course": "الأطباق الرئيسية",
      Pasta: "المعكرونة",
      Pizza: "البيتزا",
      Burgers: "البرغر",
      Drinks: "المشروبات",
      Smoothies: "العصائر",
      Desserts: "الحلويات",
    },

    guest: "+ ضيف",
    guestName: "اسم الضيف",
    add: "إضافة",
    cancel: "إلغاء",
    selectGuest:
      "يرجى اختيار ضيف أو إضافة ضيف قبل إضافة الطعام.",

    addGuest: "+ إضافة ضيف",
    item: "عنصر",
    items: "عناصر",

    tableTotal: "إجمالي الطاولة",
    tableOrder: "طلب الطاولة",
    confirmOrder: "تأكيد الطلب",

    vegetarian: "نباتي",
    backToMenu: "العودة إلى القائمة",

    order: "الطلب",
    confirmSend: "تأكيد وإرسال",

    currentOrder: "الطلب الحالي",
    noItems: "لم تتم إضافة أي عناصر بعد.",
    remove: "حذف",
    total: "الإجمالي",
  },
};

export default function Home() {
  const router = useRouter();

  const [tableNumber, setTableNumber] = useState("");
  const [serviceType, setServiceType] = useState("");
  const [language, setLanguage] = useState("en");
const text =
  translations[
    language as keyof typeof translations
  ] || translations.en;

  const [category, setCategory] = useState("All Dishes");
  const [search, setSearch] = useState("");

  const [menuItems, setMenuItems] =
    useState<MenuItem[]>(fallbackMenu);

  const [menuCategories, setMenuCategories] =
    useState<string[]>(fallbackCategories);

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
const [isConfirmingOrder, setIsConfirmingOrder] =
  useState(false);
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

  useEffect(() => {
    const loadMenuFromSupabase = async () => {
      const {
        data: categoryData,
        error: categoryError,
      } = await supabase
        .from("menu_categories")
        .select("id, name, display_order, active")
        .eq("active", true)
        .order("display_order", { ascending: true });

      if (categoryError) {
        console.error(
          "Menu categories load error:",
          categoryError
        );
      } else if (categoryData) {
        setMenuCategories([
          "All Dishes",
          ...categoryData.map(
            (item: any) => item.name
          ),
        ]);
      }

      const {
        data: itemData,
        error: itemError,
      } = await supabase
        .from("menu_items")
        .select(`
          id,
          name,
          description,
          price,
          image_url,
          vegetarian,
          station,
          display_order,
          active,
          menu_categories (
            name
          )
        `)
        .eq("active", true)
        .order("display_order", { ascending: true });

      if (itemError) {
        console.error(
          "Menu items load error:",
          itemError
        );
        return;
      }

      if (!itemData) return;

      const mappedMenu: MenuItem[] =
        itemData.map((item: any) => {
          const fallback =
            fallbackMenu.find(
              (oldItem) =>
                oldItem.name === item.name
            );

          return {
            id: Number(item.id),
            name: item.name,
            category:
              item.menu_categories?.name ||
              fallback?.category ||
              "Other",
            price: Number(item.price),
            description:
              item.description ||
              fallback?.description ||
              "",
            image:
              item.image_url ||
              fallback?.image ||
              "",
            vegetarian:
              Boolean(item.vegetarian),
            station:
              item.station === "pizza" ||
              item.station === "bar"
                ? item.station
                : "kitchen",
          };
        });

      setMenuItems(mappedMenu);
    };

    loadMenuFromSupabase();

const interval = setInterval(() => {
  loadMenuFromSupabase();
}, 3000);

return () => {
  clearInterval(interval);
};
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
    menuItems.filter((item) => {
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

  const confirmOrder = async () => {
  if (isConfirmingOrder) return;
  if (tableTotal === 0) return;

  setIsConfirmingOrder(true);

  const kitchenOrder = {
    id: Date.now(),
    orderNumber: String(Date.now()).slice(-5),
    tableNumber,
    serviceType,
    language,
    createdAt: Date.now(),
   

    guests: people.map((person, personIndex) => ({
      guestName: person,

      items: (orders[personIndex] || []).map((item) => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        price: item.price,

        // Route using the station configured in Supabase.
        station: item.station || "kitchen",

        done: false,
      })),
    })),

    total: tableTotal,
  };

  

  // Keep this because the thank-you page currently reads it
  localStorage.setItem(
  "dinevo-confirmed-order",
  JSON.stringify(kitchenOrder)
);

// SAVE ORDER TO SUPABASE
try {
  const { data: supabaseOrder, error: orderError } =
    await supabase
      .from("orders")
      .insert({
        order_number: String(kitchenOrder.orderNumber),
        table_number: String(kitchenOrder.tableNumber),
        service_type: "dine-in",
        total: kitchenOrder.total,
        kitchen_status: "pending",
        waiter_status: "waiting",
        payment_status: "unpaid",
      })
      .select("id")
      .single();

  if (orderError) {
    throw orderError;
  }

  for (const guest of kitchenOrder.guests) {
    const { data: supabaseGuest, error: guestError } =
      await supabase
        .from("order_guests")
        .insert({
          order_id: supabaseOrder.id,
          guest_name: guest.guestName,
        })
        .select("id")
        .single();

    if (guestError) {
      throw guestError;
    }

    const items = guest.items.map((item: any) => ({
      order_id: supabaseOrder.id,
      guest_id: supabaseGuest.id,
      item_name: item.name,
      price: item.price,
      quantity: item.quantity,
      station: item.station || "kitchen",
    }));

    if (items.length > 0) {
      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(items);

      if (itemsError) {
        throw itemsError;
      }
    }
  }

  console.log(
    "Order successfully saved to Supabase:",
    supabaseOrder.id
  );
} catch (error) {
  console.error(
    "Supabase order save failed:",
    error
  );

  alert(
    "Could not confirm your order. Please try again."
  );

  setIsConfirmingOrder(false);
  return;
}

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
            {text.table} {tableNumber || "—"}
          </span>

          <span>
            {serviceType === "takeaway"
  ? text.takeaway
  : text.dineIn}
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
           {text.menu}
          </h2>

          <div className="space-y-2">

            {menuCategories.map((item) => (

              <button
                key={text.categories[
  item as keyof typeof text.categories
]}
                onClick={() => setCategory(item)}
                className={`w-full rounded-lg px-3 py-3 text-left text-xs font-semibold ${
                  category === item
                    ? "bg-red-600"
                    : "bg-[#222326] hover:bg-[#303135]"
                }`}
              >
                {text.categories[
                  item as keyof typeof text.categories
                ] || item}
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
                    {text.guest}
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
                    placeholder={text.guestName}
                    className="rounded-xl border-2 border-black bg-white px-4 py-3 font-semibold text-black placeholder:text-gray-500 outline-none focus:border-red-600"
                  />

                  <button
                    onClick={addGuest}
                    className="rounded-xl bg-red-600 px-5 font-bold text-white"
                  >
                   {text.add}
                  </button>

                  <button
                    onClick={() =>
                      setShowGuestInput(false)
                    }
                    className="rounded-xl bg-gray-200 px-4"
                  >
                   {text.cancel}
                  </button>

                </div>

              )}

              {selectedPerson === null && (

                <div className="mb-5 rounded-xl bg-red-50 p-3 text-sm text-red-700">
                  {text.selectGuest}
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
              text={text}
            />

          )}

        </section>

        {/* RIGHT GUESTS */}

        <aside className="bg-[#111214] p-3 text-white">

          <h2 className="mb-4 text-sm font-bold">
          {text.guests}
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
                  className={`w-full rounded-lg border-2 px-3 py-3 text-left transition ${
  selectedPerson === index
    ? "border-white bg-red-600 text-white"
    : "border-white/60 bg-[#232427] text-white hover:border-white"
}`}
                >

                  <p className="text-sm font-bold">
                    {person}
                  </p>

                  <p className="mt-1 text-xs font-bold text-white">
  {count} {count === 1 ? text.item : text.items}
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
          {text.addGuest}
          </button>

          <div className="mt-6 border-t border-white/10 pt-4">

            <p className="text-xs text-gray-500">
              {text.tableTotal}
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
            {text.tableOrder}
          </button>

          <button
  onClick={confirmOrder}
  disabled={
    tableTotal === 0 ||
    isConfirmingOrder
  }
  className="mt-2 w-full rounded-lg bg-red-600 py-3 text-xs font-bold disabled:cursor-not-allowed disabled:bg-gray-700"
>
  {isConfirmingOrder
    ? "CONFIRMING..."
    : text.confirmOrder}
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
                  ● {text.vegetarian}
                </p>

              )}

              <button
                onClick={() =>
                  setInfoItem(null)
                }
                className="mt-6 w-full rounded-xl bg-black py-3 font-bold text-white"
              >
                {text.backToMenu}
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
                  {text.table} {tableNumber} {text.order}
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
               {text.tableTotal}
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
                {text.backToMenu}
              </button>

              <button
  onClick={confirmOrder}
  disabled={isConfirmingOrder}
  className="flex-1 rounded-xl bg-red-600 py-3 font-bold text-white disabled:cursor-not-allowed disabled:bg-gray-400"
>
  {isConfirmingOrder
    ? "CONFIRMING..."
    : text.confirmSend}
</button>

            </div>

          </div>

        </div>

      )}

    </main>
  );
}

type GuestOrderViewProps = {
  text: {
  currentOrder: string;
  backToMenu: string;
  noItems: string;
  remove: string;
  total: string;
};
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
  text,
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
           {text.currentOrder}
          </p>

          <h2 className="text-3xl font-bold">
            {guestName}
          </h2>

        </div>

        <button
          onClick={onBack}
          className="rounded-xl bg-black px-5 py-3 font-bold text-white"
        >
         ← {text.backToMenu}
        </button>

      </div>

      {order.length === 0 ? (

        <div className="rounded-2xl bg-white p-10 text-center text-gray-400">
          {text.noItems}
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
                 {text.remove}
                </button>

              </div>

            </div>

          ))}

        </div>

      )}

      <div className="mt-6 flex justify-between rounded-xl bg-black p-5 text-white">

        <strong>
          {guestName} {text.total}
        </strong>

        <strong className="text-2xl text-red-500">
          €{total.toFixed(2)}
        </strong>

      </div>

    </div>

  );
}