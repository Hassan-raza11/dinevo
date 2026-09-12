"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import StaffGuard from "@/components/StaffGuard";
import StaffLogout from "@/components/StaffLogout";

type PaymentPart = {
  id: number;
  method: "cash" | "card" | "ticket" | "other";
  amount: number;
};

type AdminItem = {
  name: string;
  quantity: number;
  price: number;
};

type AdminGuest = {
  guestName: string;
  items: AdminItem[];
};

type AdminOrder = {
  id: number;
  orderNumber: string;
  tableNumber: string;
  createdAt: number;
  total: number;

  guests: AdminGuest[];

  paymentStatus?: "unpaid" | "paid";
  paidAt?: number;

  kitchenStatus?: string;
  waiterStatus?: string;

  paymentBreakdown?: PaymentPart[];
};

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

type MenuCategory = {
  id: number;
  name: string;
  display_order: number;
  active: boolean;
};

type MenuAdminItem = {
  id: number;
  name: string;
  description: string | null;
  price: number;
  category_id: number | null;
  image_url: string | null;
  vegetarian: boolean;
  station: "kitchen" | "pizza" | "bar";
  active: boolean;
  display_order: number;
};


export default function AdminPage() {

const [editingDish, setEditingDish] =
  useState<MenuAdminItem | null>(null);

const [showAddDish, setShowAddDish] =
  useState(false);

const [newDishName, setNewDishName] =
  useState("");

const [newDishDescription, setNewDishDescription] =
  useState("");

const [newDishPrice, setNewDishPrice] =
  useState("");

const [newDishCategoryId, setNewDishCategoryId] =
  useState<number | null>(null);

const [newDishImageUrl, setNewDishImageUrl] =
  useState("");

const [isUploadingDishImage, setIsUploadingDishImage] =
  useState(false);

const [newDishVegetarian, setNewDishVegetarian] =
  useState(false);

const [newDishStation, setNewDishStation] =
  useState<"kitchen" | "pizza" | "bar">("kitchen");
const [menuCategories, setMenuCategories] =
  useState<MenuCategory[]>([]);

const [menuItems, setMenuItems] =
  useState<MenuAdminItem[]>([]);

const [showMenuManagement, setShowMenuManagement] =
  useState(false);


  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [now, setNow] = useState<number | null>(null);
  const [selectedSalesDay, setSelectedSalesDay] =
  useState<string | null>(null);

  const [settings, setSettings] =
    useState<RestaurantSettings>(defaultSettings);

  const [draftSettings, setDraftSettings] =
    useState<RestaurantSettings>(defaultSettings);

  const [showSettings, setShowSettings] = useState(false);

  // LOAD RESTAURANT SETTINGS FROM SUPABASE
  useEffect(() => {
    const loadSettings = async () => {
      const { data, error } = await supabase
        .from("restaurant_settings")
        .select(`
          id,
          restaurant_name,
          tax_rate,
          preparation_time,
          currency,
          currency_symbol
        `)
        .eq("id", 1)
        .single();

      if (error) {
        console.error("Admin settings load error:", error);
        return;
      }

      if (!data) return;

      const loadedSettings: RestaurantSettings = {
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
      };

      // Keep the live saved settings synchronized,
      // but DO NOT overwrite draftSettings here.
      // draftSettings is the form the manager is currently typing into.
      setSettings(loadedSettings);

      localStorage.setItem(
        "dinevo-settings",
        JSON.stringify(loadedSettings)
      );
    };

    loadSettings();

    // Backup polling keeps Admin synchronized even if Realtime is disabled.
    const settingsInterval = setInterval(() => {
      loadSettings();
    }, 5000);

    const settingsChannel = supabase
      .channel("dinevo-admin-settings-live")
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
      clearInterval(settingsInterval);
      supabase.removeChannel(settingsChannel);
    };
  }, []);

  // LOAD ORDERS
  useEffect(() => {
  const loadOrders = async () => {
    const { data, error } = await supabase
      .from("orders")
      .select(`
        *,
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
          amount
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Admin Supabase load error:", error);
      return;
    }

    const formattedOrders = (data || []).map(
      (order: any) => ({
        id: order.id,
        orderNumber: order.order_number,
        tableNumber: order.table_number,
        total: Number(order.total),
        createdAt: new Date(order.created_at).getTime(),

        kitchenStatus: order.kitchen_status,
        waiterStatus: order.waiter_status,

        paymentStatus: order.payment_status,

        paidAt: order.paid_at
          ? new Date(order.paid_at).getTime()
          : undefined,

        paymentBreakdown:
          order.payments?.map((payment: any) => ({
            method: payment.method,
            amount: Number(payment.amount),
          })) || [],

        guests:
          order.order_guests?.map((guest: any) => ({
            guestName: guest.guest_name,

            items:
              guest.order_items?.map((item: any) => ({
                id: item.id,
                name: item.item_name,
                price: Number(item.price),
                quantity: item.quantity,
                station: item.station,
              })) || [],
          })) || [],
      })
    );

    setOrders(formattedOrders);
    setNow(Date.now());
  };

  loadOrders();

  const channel = supabase
    .channel("admin-orders")
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

  const interval = setInterval(() => {
    setNow(Date.now());
  }, 1000);

  return () => {
    clearInterval(interval);
    supabase.removeChannel(channel);
  };
}, []);

// LOAD MENU FROM SUPABASE
useEffect(() => {
  const loadAdminMenu = async () => {
    const {
      data: categoryData,
      error: categoryError,
    } = await supabase
      .from("menu_categories")
      .select("*")
      .order("display_order", {
        ascending: true,
      });

    if (categoryError) {
      console.error(
        "Admin menu categories load error:",
        categoryError
      );
    } else {
      setMenuCategories(
        (categoryData || []).map((item: any) => ({
          id: Number(item.id),
          name: item.name,
          display_order: item.display_order || 0,
          active: Boolean(item.active),
        }))
      );
    }

    const {
      data: itemData,
      error: itemError,
    } = await supabase
      .from("menu_items")
      .select("*")
      .order("display_order", {
        ascending: true,
      });

    if (itemError) {
      console.error(
        "Admin menu items load error:",
        itemError
      );
    } else {
      setMenuItems(
        (itemData || []).map((item: any) => ({
          id: Number(item.id),
          name: item.name,
          description: item.description,
          price: Number(item.price),
          category_id: item.category_id
            ? Number(item.category_id)
            : null,
          image_url: item.image_url,
          vegetarian: Boolean(item.vegetarian),
          station:
            item.station === "pizza" ||
            item.station === "bar"
              ? item.station
              : "kitchen",
          active: Boolean(item.active),
          display_order: item.display_order || 0,
        }))
      );
    }
  };

  loadAdminMenu();
}, []);


  // TODAY'S ORDERS
  const todayOrders = useMemo(() => {
    if (!now) return [];

    const today = new Date(now);

    return orders.filter((order) => {
      const orderDate = new Date(order.createdAt);

      return (
        orderDate.getFullYear() === today.getFullYear() &&
        orderDate.getMonth() === today.getMonth() &&
        orderDate.getDate() === today.getDate()
      );
    });
  }, [orders, now]);

  const paidOrders = todayOrders.filter(
    (order) => order.paymentStatus === "paid"
  );

  const activeOrders = todayOrders.filter(
    (order) => order.paymentStatus !== "paid"
  );

  const todayRevenue = paidOrders.reduce(
    (sum, order) => sum + order.total,
    0
  );
const todayPaymentBreakdown = paidOrders.reduce(
  (totals, order) => {
    order.paymentBreakdown?.forEach((payment) => {
      if (payment.method === "cash") {
        totals.cash += payment.amount;
      } else if (payment.method === "card") {
        totals.card += payment.amount;
      } else if (payment.method === "ticket") {
        totals.ticket += payment.amount;
      } else {
        totals.other += payment.amount;
      }
    });

    return totals;
  },
  {
    cash: 0,
    card: 0,
    ticket: 0,
    other: 0,
  }
);
  const todayItemSales = useMemo(() => {
  const salesMap: Record<
    string,
    {
      name: string;
      quantity: number;
      revenue: number;
    }
  > = {};

  paidOrders.forEach((order) => {
    order.guests?.forEach((guest) => {
      guest.items?.forEach((item) => {
        if (!salesMap[item.name]) {
          salesMap[item.name] = {
            name: item.name,
            quantity: 0,
            revenue: 0,
          };
        }

        salesMap[item.name].quantity += item.quantity;

        salesMap[item.name].revenue +=
          item.price * item.quantity;
      });
    });
  });

  return Object.values(salesMap).sort(
    (a, b) => b.quantity - a.quantity
  );
}, [paidOrders]);

const salesHistory = useMemo(() => {
  const grouped: Record<
    string,
    {
      dateKey: string;
      dateLabel: string;
      orders: number;
      revenue: number;
      itemSales: Record<
        string,
        {
          name: string;
          quantity: number;
        }
      >;
    }
  > = {};

  orders
    .filter((order) => order.paymentStatus === "paid")
    .forEach((order) => {
      const sourceDate = new Date(
        order.paidAt || order.createdAt
      );

      const dateKey = `${sourceDate.getFullYear()}-${String(
        sourceDate.getMonth() + 1
      ).padStart(2, "0")}-${String(
        sourceDate.getDate()
      ).padStart(2, "0")}`;

      const dateLabel = sourceDate.toLocaleDateString(
        undefined,
        {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }
      );

      if (!grouped[dateKey]) {
        grouped[dateKey] = {
          dateKey,
          dateLabel,
          orders: 0,
          revenue: 0,
          itemSales: {},
        };
      }

      grouped[dateKey].orders += 1;
      grouped[dateKey].revenue += order.total;

      order.guests?.forEach((guest) => {
        guest.items?.forEach((item) => {
          if (!grouped[dateKey].itemSales[item.name]) {
            grouped[dateKey].itemSales[item.name] = {
              name: item.name,
              quantity: 0,
            };
          }

          grouped[dateKey].itemSales[
            item.name
          ].quantity += item.quantity;
        });
      });
    });

  return Object.values(grouped)
    .map((day) => {
      const topItem = Object.values(day.itemSales).sort(
        (a, b) => b.quantity - a.quantity
      )[0];

      return {
        dateKey: day.dateKey,
        dateLabel: day.dateLabel,
        orders: day.orders,
        revenue: day.revenue,
        topItem: topItem || null,
      };
    })
    .sort((a, b) =>
      b.dateKey.localeCompare(a.dateKey)
    );
}, [orders]);

const selectedDayReport = useMemo(() => {
  if (!selectedSalesDay) return null;

  const selectedOrders = orders.filter((order) => {
    if (order.paymentStatus !== "paid") return false;

    const sourceDate = new Date(
      order.paidAt || order.createdAt
    );

    const dateKey = `${sourceDate.getFullYear()}-${String(
      sourceDate.getMonth() + 1
    ).padStart(2, "0")}-${String(
      sourceDate.getDate()
    ).padStart(2, "0")}`;

    return dateKey === selectedSalesDay;
  });

  const itemMap: Record<
    string,
    {
      name: string;
      quantity: number;
      revenue: number;
    }
  > = {};

  let cash = 0;
  let card = 0;
  let ticketRestaurant = 0;
  let other = 0;

  selectedOrders.forEach((order) => {
    order.guests?.forEach((guest) => {
      guest.items?.forEach((item) => {
        if (!itemMap[item.name]) {
          itemMap[item.name] = {
            name: item.name,
            quantity: 0,
            revenue: 0,
          };
        }

        itemMap[item.name].quantity += item.quantity;

        itemMap[item.name].revenue +=
          item.price * item.quantity;
      });
    });

    order.paymentBreakdown?.forEach((payment: any) => {
      const method = payment.method?.toLowerCase();

      if (method === "cash") {
        cash += payment.amount;
      } else if (method === "card") {
        card += payment.amount;
      } else if (
        method === "ticket restaurant"
      ) {
        ticketRestaurant += payment.amount;
      } else {
        other += payment.amount;
      }
    });
  });

  const revenue = selectedOrders.reduce(
    (sum, order) => sum + order.total,
    0
  );

  return {
    orders: selectedOrders,
    revenue,
    cash,
    card,
    ticketRestaurant,
    other,
    items: Object.values(itemMap).sort(
      (a, b) => b.quantity - a.quantity
    ),
  };
}, [selectedSalesDay, orders]);

  // RESET DEMO
  const resetDemo = () => {
    const confirmed = window.confirm(
      "Are you sure you want to clear all Dinevo demo orders?"
    );

    if (!confirmed) return;

    localStorage.removeItem("dinevo-orders");
    localStorage.removeItem("dinevo-confirmed-order");
    localStorage.removeItem("dinevo-last-receipt");

    setOrders([]);

    alert("Demo orders have been cleared.");
  };

  // OPEN SETTINGS
  const openSettings = () => {
    setDraftSettings(settings);
    setShowSettings(true);
  };

  // CHANGE CURRENCY
  const changeCurrency = (currency: string) => {
    let symbol = "€";

    if (currency === "USD") {
      symbol = "$";
    }

    if (currency === "GBP") {
      symbol = "£";
    }

    setDraftSettings((current) => ({
      ...current,
      currency,
      currencySymbol: symbol,
    }));
  };

  // SAVE SETTINGS
  const saveSettings = async () => {
    if (!draftSettings.restaurantName.trim()) {
      alert("Please enter the restaurant name.");
      return;
    }

    if (
      draftSettings.taxRate < 0 ||
      draftSettings.taxRate > 100
    ) {
      alert("Please enter a valid tax rate.");
      return;
    }

    if (draftSettings.preparationTime <= 0) {
      alert("Preparation time must be greater than 0.");
      return;
    }

    const { data, error } = await supabase
      .from("restaurant_settings")
      .update({
        restaurant_name: draftSettings.restaurantName.trim(),
        tax_rate: draftSettings.taxRate,
        preparation_time: draftSettings.preparationTime,
        currency: draftSettings.currency,
        currency_symbol: draftSettings.currencySymbol,
      })
      .eq("id", 1)
      .select(`
        id,
        restaurant_name,
        tax_rate,
        preparation_time,
        currency,
        currency_symbol
      `)
      .single();

    if (error || !data) {
      console.error(
        "Supabase settings save error:",
        error || "No settings row was updated."
      );

      alert(
        "Restaurant settings were NOT saved to Supabase. Please check the restaurant_settings UPDATE policy in Supabase."
      );
      return;
    }

    const savedSettings: RestaurantSettings = {
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
    };

    localStorage.setItem(
      "dinevo-settings",
      JSON.stringify(savedSettings)
    );

    setSettings(savedSettings);
    setDraftSettings(savedSettings);
    setShowSettings(false);

    alert("Restaurant settings saved successfully.");
  };

const uploadDishImage = async (file: File, mode: "new" | "edit") => {
  if (!file.type.startsWith("image/")) {
    alert("Please select an image file.");
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    alert("Please choose an image smaller than 5 MB.");
    return;
  }

  setIsUploadingDishImage(true);

  try {
    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const safeExtension = extension.replace(/[^a-z0-9]/g, "") || "jpg";
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${safeExtension}`;
    const filePath = `dishes/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("menu-images")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type,
      });

    if (uploadError) throw uploadError;

    const { data: publicUrlData } = supabase.storage
      .from("menu-images")
      .getPublicUrl(filePath);

    const publicUrl = publicUrlData.publicUrl;
    if (!publicUrl) throw new Error("Could not create the image URL.");

    if (mode === "new") {
      setNewDishImageUrl(publicUrl);
    } else {
      setEditingDish((current) =>
        current ? { ...current, image_url: publicUrl } : current
      );
    }
  } catch (error: any) {
    console.error("Dish image upload error:", error);
    alert(
      `Could not upload the image.\n\n${
        error?.message ||
        'Make sure the Supabase Storage bucket "menu-images" exists and allows uploads.'
      }`
    );
  } finally {
    setIsUploadingDishImage(false);
  }
};

const addDish = async () => {
  if (!newDishName.trim()) {
    alert("Please enter the dish name.");
    return;
  }

  if (!newDishPrice || Number(newDishPrice) < 0) {
    alert("Please enter a valid price.");
    return;
  }

  if (!newDishCategoryId) {
    alert("Please select a category.");
    return;
  }

  const { data, error } = await supabase
    .from("menu_items")
    .insert({
      name: newDishName.trim(),
      description:
        newDishDescription.trim() || null,
      price: Number(newDishPrice),
      category_id: newDishCategoryId,
      image_url:
        newDishImageUrl.trim() || null,
      vegetarian: newDishVegetarian,
      station: newDishStation,
      active: true,
      display_order: menuItems.length + 1,
    })
    .select()
    .single();

  if (error) {
    console.error(
      "Add dish error:",
      error
    );

    alert("Could not add the dish.");
    return;
  }

  if (data) {
    setMenuItems((current) => [
      ...current,
      {
        id: Number(data.id),
        name: data.name,
        description: data.description,
        price: Number(data.price),
        category_id: data.category_id
          ? Number(data.category_id)
          : null,
        image_url: data.image_url,
        vegetarian: Boolean(
          data.vegetarian
        ),
        station:
          data.station === "pizza" ||
          data.station === "bar"
            ? data.station
            : "kitchen",
        active: Boolean(data.active),
        display_order:
          data.display_order || 0,
      },
    ]);
  }

  setNewDishName("");
  setNewDishDescription("");
  setNewDishPrice("");
  setNewDishCategoryId(null);
  setNewDishImageUrl("");
  setNewDishVegetarian(false);
  setNewDishStation("kitchen");

  setShowAddDish(false);

  alert("Dish added successfully.");
};

const toggleDishAvailability = async (
  item: MenuAdminItem
) => {
  const nextActive = !item.active;

  const { data, error } = await supabase
    .from("menu_items")
    .update({
      active: nextActive,
      updated_at: new Date().toISOString(),
    })
    .eq("id", item.id)
    .select("id, active");

  if (error) {
    console.error("Dish availability update error:", error);
    alert("Could not change dish availability in Supabase.");
    return;
  }

  const savedRow = data?.[0];

  if (
    !savedRow ||
    Number(savedRow.id) !== Number(item.id) ||
    Boolean(savedRow.active) !== nextActive
  ) {
    console.error("Dish availability was not persisted:", {
      itemId: item.id,
      requested: nextActive,
      returned: data,
    });

    alert(
      "Supabase did not save the Sold Out status. The menu item was not changed."
    );
    return;
  }

  setMenuItems((current) =>
    current.map((dish) =>
      dish.id === item.id
        ? { ...dish, active: Boolean(savedRow.active) }
        : dish
    )
  );
};

const saveEditedDish = async () => {
  if (!editingDish) return;

  if (!editingDish.name.trim()) {
    alert("Please enter the dish name.");
    return;
  }

  if (editingDish.price < 0) {
    alert("Please enter a valid price.");
    return;
  }

  if (!editingDish.category_id) {
    alert("Please select a category.");
    return;
  }

  const { error } = await supabase
    .from("menu_items")
    .update({
      name: editingDish.name.trim(),
      description:
        editingDish.description?.trim() || null,
      price: editingDish.price,
      category_id: editingDish.category_id,
      image_url:
        editingDish.image_url?.trim() || null,
      vegetarian: editingDish.vegetarian,
      station: editingDish.station,
      active: editingDish.active,
      display_order: editingDish.display_order,
      updated_at: new Date().toISOString(),
    })
    .eq("id", editingDish.id);

  if (error) {
    console.error("Edit dish error:", error);
    alert("Could not update the dish.");
    return;
  }

  setMenuItems((current) =>
    current.map((item) =>
      item.id === editingDish.id
        ? { ...editingDish }
        : item
    )
  );

  setEditingDish(null);

  alert("Dish updated successfully.");
};

  return (
    <StaffGuard>
    <main className="min-h-screen overflow-x-hidden bg-[#0d0f10] text-white">



      {/* HEADER */}

      <header className="flex flex-col gap-4 border-b border-white/10 px-4 py-4 sm:px-6 sm:py-5 lg:flex-row lg:items-center lg:justify-between lg:px-7">

        <div>
          <h1 className="text-2xl font-black sm:text-3xl">
            DINE
            <span className="text-red-500">
              VO
            </span>
          </h1>

          <p className="mt-1 text-sm text-gray-400">
            Restaurant Admin
          </p>
        </div>

        <div className="flex w-full flex-wrap items-center gap-2 sm:gap-3 lg:w-auto lg:justify-end">

          <div className="min-w-[120px] flex-1 rounded-xl bg-[#171a1d] px-4 py-3 text-center sm:flex-none sm:px-5 sm:text-right">

            <p className="font-bold">
              {now
                ? new Date(now).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "--:--"}
            </p>

            <p className="text-xs text-gray-500">
              {now
                ? new Date(now).toLocaleDateString()
                : "--"}
            </p>

          </div>

<button
  onClick={() => setShowMenuManagement(true)}
  className="min-h-11 flex-1 rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-red-700 sm:flex-none sm:px-5 sm:text-base"
>
  Menu Management
</button>

          <button
            onClick={resetDemo}
            className="min-h-11 flex-1 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-400 transition hover:bg-red-600 hover:text-white sm:flex-none sm:px-5 sm:text-base"
          >
            Reset Demo
          </button>

          <StaffLogout />

        </div>

      </header>

      {/* DASHBOARD */}

      <section className="p-3 sm:p-4 lg:p-6">

        {/* STAT CARDS */}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">

          <div className="rounded-2xl border border-white/10 bg-[#141719] p-4 sm:p-5">

            <p className="text-sm font-bold text-gray-500">
              TODAY&apos;S ORDERS
            </p>

            <p className="mt-3 text-3xl font-black sm:text-4xl">
              {todayOrders.length}
            </p>

          </div>

          <div className="rounded-2xl border border-white/10 bg-[#141719] p-4 sm:p-5">

            <p className="text-sm font-bold text-gray-500">
              ACTIVE ORDERS
            </p>

            <p className="mt-3 text-3xl font-black sm:text-4xl text-orange-400">
              {activeOrders.length}
            </p>

          </div>

          <div className="rounded-2xl border border-white/10 bg-[#141719] p-4 sm:p-5">

            <p className="text-sm font-bold text-gray-500">
              PAID ORDERS
            </p>

            <p className="mt-3 text-3xl font-black sm:text-4xl text-green-500">
              {paidOrders.length}
            </p>

          </div>

          <div className="rounded-2xl border border-red-500/20 bg-[#141719] p-5">

            <p className="text-sm font-bold text-gray-500">
              TODAY&apos;S REVENUE
            </p>

            <p className="mt-3 text-3xl font-black sm:text-4xl text-red-500">
              {settings.currencySymbol}
              {todayRevenue.toFixed(2)}
            </p>

          </div>

        </div>
{/* TODAY'S PAYMENT BREAKDOWN */}
<div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">

  <div className="rounded-2xl border border-white/10 bg-[#141719] p-4 sm:p-5">
    <p className="text-sm font-bold text-gray-500">
      CASH
    </p>

    <p className="mt-3 text-2xl font-black sm:text-3xl">
      {settings.currencySymbol}
      {todayPaymentBreakdown.cash.toFixed(2)}
    </p>
  </div>

  <div className="rounded-2xl border border-white/10 bg-[#141719] p-4 sm:p-5">
    <p className="text-sm font-bold text-gray-500">
      CARD
    </p>

    <p className="mt-3 text-2xl font-black sm:text-3xl">
      {settings.currencySymbol}
      {todayPaymentBreakdown.card.toFixed(2)}
    </p>
  </div>

  <div className="rounded-2xl border border-white/10 bg-[#141719] p-4 sm:p-5">
    <p className="text-sm font-bold text-gray-500">
      TICKET RESTAURANT
    </p>

    <p className="mt-3 text-2xl font-black sm:text-3xl">
      {settings.currencySymbol}
      {todayPaymentBreakdown.ticket.toFixed(2)}
    </p>
  </div>

  <div className="rounded-2xl border border-white/10 bg-[#141719] p-4 sm:p-5">
    <p className="text-sm font-bold text-gray-500">
      OTHER
    </p>

    <p className="mt-3 text-2xl font-black sm:text-3xl">
      {settings.currencySymbol}
      {todayPaymentBreakdown.other.toFixed(2)}
    </p>
  </div>

</div>

        {/* MAIN ROW */}

        <div className="mt-4 grid grid-cols-1 gap-4 sm:mt-6 sm:gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">

          {/* TODAY'S ORDERS */}

          <section className="rounded-2xl border border-white/10 bg-[#141719] p-4 sm:p-5">

            <div className="flex flex-wrap items-center justify-between gap-3">

              <div>
                <h2 className="text-xl font-black">
                  TODAY&apos;S ORDERS
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Current restaurant activity
                </p>
              </div>

              <span className="rounded-lg bg-red-500/10 px-3 py-2 text-xs font-bold text-red-400">
                {todayOrders.length} Orders
              </span>

            </div>

            <div className="mt-5 space-y-3">

              {todayOrders.length === 0 ? (

                <div className="rounded-xl bg-[#1a1e21] p-8 text-center text-gray-500">
                  No orders today.
                </div>

              ) : (

                todayOrders
                  .slice()
                  .reverse()
                  .map((order) => (

                    <div
                      key={order.id}
                      className="grid grid-cols-2 gap-3 rounded-xl border border-white/5 bg-[#1a1e21] p-4 sm:grid-cols-4 sm:items-center sm:gap-0"
                    >

                      <div>
                        <p className="font-black">
                          Table {order.tableNumber}
                        </p>

                        <p className="mt-1 text-xs text-gray-500">
                          #{order.orderNumber}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-gray-500">
                          Kitchen
                        </p>

                        <p
                          className={`mt-1 text-sm font-bold ${
                            order.kitchenStatus === "completed"
                              ? "text-green-500"
                              : "text-orange-400"
                          }`}
                        >
                          {order.kitchenStatus === "completed"
                            ? "Completed"
                            : "Preparing"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-gray-500">
                          Payment
                        </p>

                        <p
                          className={`mt-1 text-sm font-bold ${
                            order.paymentStatus === "paid"
                              ? "text-green-500"
                              : "text-blue-400"
                          }`}
                        >
                          {order.paymentStatus === "paid"
                            ? "Paid"
                            : "Unpaid"}
                        </p>
                      </div>

                      <div className="text-right">

                        <p className="font-black">
                          {settings.currencySymbol}
                          {order.total.toFixed(2)}
                        </p>

                        <p className="mt-1 text-xs text-gray-500">
                          {new Date(
                            order.createdAt
                          ).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>

                      </div>

                    </div>

                  ))

              )}

            </div>

          </section>

          {/* RESTAURANT SETTINGS */}

          <aside className="rounded-2xl border border-white/10 bg-[#141719] p-4 sm:p-5">

            <div className="flex items-start justify-between">

              <div>
                <h2 className="text-xl font-black">
                  RESTAURANT SETTINGS
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Restaurant configuration
                </p>
              </div>

              <button
                onClick={openSettings}
                className="rounded-lg bg-red-600 px-3 py-2 text-xs font-bold hover:bg-red-700"
              >
                Edit
              </button>

            </div>

            <div className="mt-6 space-y-3">

              {/* RESTAURANT */}

              <div className="rounded-xl bg-[#1a1e21] p-4">

                <p className="text-xs text-gray-500">
                  Restaurant
                </p>

                <p className="mt-2 font-black">
                  {settings.restaurantName}
                </p>

              </div>

              {/* TAX */}

              <div className="rounded-xl bg-[#1a1e21] p-4">

                <p className="text-xs text-gray-500">
                  Tax
                </p>

                <div className="mt-2 flex flex-wrap items-center justify-between gap-3">

                  <strong>
                    Included Tax
                  </strong>

                  <span className="font-black text-red-500">
                    {settings.taxRate}%
                  </span>

                </div>

              </div>

              {/* PREPARATION */}

              <div className="rounded-xl bg-[#1a1e21] p-4">

                <p className="text-xs text-gray-500">
                  Kitchen Target
                </p>

                <div className="mt-2 flex flex-wrap items-center justify-between gap-3">

                  <strong>
                    Preparation Time
                  </strong>

                  <span className="font-black text-red-500">
                    {settings.preparationTime} min
                  </span>

                </div>

              </div>

              {/* CURRENCY */}

              <div className="rounded-xl bg-[#1a1e21] p-4">

                <p className="text-xs text-gray-500">
                  Currency
                </p>

                <div className="mt-2 flex flex-wrap items-center justify-between gap-3">

                  <strong>
                    {settings.currency}
                  </strong>

                  <span className="font-black text-red-500">
                    {settings.currencySymbol}
                  </span>

                </div>

              </div>

            </div>

          </aside>

        </div>

      </section>
{/* TODAY'S ITEM SALES */}
<section className="mt-6 rounded-2xl border border-white/10 bg-[#141719] p-4 sm:p-5">

  <div className="flex flex-wrap items-center justify-between gap-3">
    <div>
      <h2 className="text-xl font-black">
        TODAY&apos;S ITEM SALES
      </h2>

      <p className="mt-1 text-sm text-gray-500">
        Items sold from completed paid orders
      </p>
    </div>

    <span className="rounded-lg bg-red-500/10 px-3 py-2 text-xs font-bold text-red-400">
      {todayItemSales.length} Items
    </span>
  </div>

  <div className="mt-5 space-y-3">
    {todayItemSales.length === 0 ? (
      <div className="rounded-xl bg-[#1a1e21] p-8 text-center text-gray-500">
        No item sales yet today.
      </div>
    ) : (
      todayItemSales.map((item) => (
        <div
          key={item.name}
          className="grid grid-cols-1 gap-3 rounded-xl border border-white/5 bg-[#1a1e21] p-4 sm:grid-cols-[1fr_100px_130px] sm:items-center md:grid-cols-[1fr_120px_150px]"
        >
          <div>
            <p className="font-black">
              {item.name}
            </p>
          </div>

          <div>
            <p className="text-xs text-gray-500">
              Quantity
            </p>

            <p className="mt-1 font-black text-red-500">
              {item.quantity}
            </p>
          </div>

          <div className="text-right">
            <p className="text-xs text-gray-500">
              Revenue
            </p>

            <p className="mt-1 font-black">
              {settings.currencySymbol}
              {item.revenue.toFixed(2)}
            </p>
          </div>
        </div>
      ))
    )}
  </div>

</section>

{/* SALES HISTORY */}
<section className="mt-6 rounded-2xl border border-white/10 bg-[#141719] p-4 sm:p-5">

  <div className="flex flex-wrap items-center justify-between gap-3">
    <div>
      <h2 className="text-xl font-black">
        SALES HISTORY
      </h2>

      <p className="mt-1 text-sm text-gray-500">
        Daily sales archive
      </p>
    </div>

    <span className="rounded-lg bg-red-500/10 px-3 py-2 text-xs font-bold text-red-400">
      {salesHistory.length} Days
    </span>
  </div>

  <div className="mt-5 space-y-3">

    {salesHistory.length === 0 ? (
      <div className="rounded-xl bg-[#1a1e21] p-8 text-center text-gray-500">
        No sales history available yet.
      </div>
    ) : (
      salesHistory.map((day) => (
        <div
  key={day.dateKey}
  className="grid grid-cols-2 gap-4 rounded-xl border border-white/5 bg-[#1a1e21] p-4 md:grid-cols-[1fr_100px_140px_1fr_110px] md:items-center"
>

          <div>
            <p className="font-black">
              {day.dateLabel}
            </p>

            <p className="mt-1 text-xs text-gray-500">
              Daily sales summary
            </p>
          </div>

          <div>
            <p className="text-xs text-gray-500">
              Orders
            </p>

            <p className="mt-1 font-black">
              {day.orders}
            </p>
          </div>

          <div>
            <p className="text-xs text-gray-500">
              Revenue
            </p>

            <p className="mt-1 font-black text-red-500">
              {settings.currencySymbol}
              {day.revenue.toFixed(2)}
            </p>
          </div>

          <div className="text-right">
            <p className="text-xs text-gray-500">
              Top Item
            </p>

            <p className="mt-1 font-bold">
              {day.topItem
                ? `${day.topItem.name} ×${day.topItem.quantity}`
                : "—"}
            </p>
          </div>

<div className="text-right">
  <button
    onClick={() =>
      setSelectedSalesDay(day.dateKey)
    }
    className="rounded-lg bg-red-600 px-4 py-2 text-xs font-black text-white hover:bg-red-500"
  >
    VIEW DAY
  </button>
</div>

        </div>
      ))
    )}

  </div>

</section>

{/* DAILY SALES REPORT MODAL */}
{selectedSalesDay && selectedDayReport && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-2 sm:p-4 lg:p-6">

    <div className="max-h-[94vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-white/10 bg-[#111416] p-4 sm:p-6">

      <div className="flex items-start justify-between">

        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-red-500">
            Daily Sales Report
          </p>

          <h2 className="mt-1 text-2xl font-black">
            {new Date(
              `${selectedSalesDay}T12:00:00`
            ).toLocaleDateString(undefined, {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          </h2>
        </div>

        <button
          onClick={() =>
            setSelectedSalesDay(null)
          }
          className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 font-bold text-gray-300 hover:bg-white/10"
        >
          CLOSE
        </button>

      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">

        <div className="rounded-xl bg-[#1a1e21] p-5">
          <p className="text-xs text-gray-500">
            Total Orders
          </p>

          <p className="mt-2 text-2xl font-black">
            {selectedDayReport.orders.length}
          </p>
        </div>

        <div className="rounded-xl bg-[#1a1e21] p-5">
          <p className="text-xs text-gray-500">
            Total Revenue
          </p>

          <p className="mt-2 text-2xl font-black text-red-500">
            {settings.currencySymbol}
            {selectedDayReport.revenue.toFixed(2)}
          </p>
        </div>

        <div className="rounded-xl bg-[#1a1e21] p-5">
          <p className="text-xs text-gray-500">
            Items Sold
          </p>

          <p className="mt-2 text-2xl font-black">
            {selectedDayReport.items.reduce(
              (sum, item) =>
                sum + item.quantity,
              0
            )}
          </p>
        </div>

      </div>

      <div className="mt-6">

        <h3 className="text-lg font-black">
          PAYMENT BREAKDOWN
        </h3>

        <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">

          <div className="rounded-xl bg-[#1a1e21] p-4">
            <p className="text-xs text-gray-500">
              Cash
            </p>

            <p className="mt-1 font-black">
              {settings.currencySymbol}
              {selectedDayReport.cash.toFixed(2)}
            </p>
          </div>

          <div className="rounded-xl bg-[#1a1e21] p-4">
            <p className="text-xs text-gray-500">
              Card
            </p>

            <p className="mt-1 font-black">
              {settings.currencySymbol}
              {selectedDayReport.card.toFixed(2)}
            </p>
          </div>

          <div className="rounded-xl bg-[#1a1e21] p-4">
            <p className="text-xs text-gray-500">
              Ticket Restaurant
            </p>

            <p className="mt-1 font-black">
              {settings.currencySymbol}
              {selectedDayReport.ticketRestaurant.toFixed(2)}
            </p>
          </div>

          <div className="rounded-xl bg-[#1a1e21] p-4">
            <p className="text-xs text-gray-500">
              Other
            </p>

            <p className="mt-1 font-black">
              {settings.currencySymbol}
              {selectedDayReport.other.toFixed(2)}
            </p>
          </div>

        </div>

      </div>

      <div className="mt-6">

        <h3 className="text-lg font-black">
          ITEM SALES
        </h3>

        <div className="mt-3 space-y-2">

          {selectedDayReport.items.map(
            (item) => (
              <div
                key={item.name}
                className="grid grid-cols-1 gap-3 rounded-xl bg-[#1a1e21] p-4 sm:grid-cols-[1fr_100px_140px] sm:items-center md:grid-cols-[1fr_120px_160px]"
              >

                <div className="font-bold">
                  {item.name}
                </div>

                <div>
                  <p className="text-xs text-gray-500">
                    Quantity
                  </p>

                  <p className="font-black text-red-500">
                    {item.quantity}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-xs text-gray-500">
                    Revenue
                  </p>

                  <p className="font-black">
                    {settings.currencySymbol}
                    {item.revenue.toFixed(2)}
                  </p>
                </div>

              </div>
            )
          )}

        </div>

      </div>

    </div>

  </div>
)}

{/* MENU MANAGEMENT MODAL */}
{showMenuManagement && (
  <div className="fixed inset-0 z-50 bg-black/80 p-2 sm:p-4 lg:p-5">
    <div className="mx-auto flex max-h-[94vh] w-full max-w-7xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#111416]">

      {/* HEADER */}
      <div className="flex items-start justify-between gap-3 border-b border-white/10 p-4 sm:p-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-red-500">
            DINEVO ADMIN
          </p>

          <h2 className="mt-1 text-2xl font-black">
            Menu Management
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Manage restaurant categories and dishes
          </p>
        </div>

        <button
          onClick={() => setShowMenuManagement(false)}
          className="rounded-xl border border-white/10 bg-[#1a1e21] px-4 py-2 font-bold text-gray-300 hover:bg-white/10"
        >
          ✕
        </button>
      </div>

      {/* CONTENT */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-y-auto p-3 sm:p-5 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-5 lg:p-6">

        {/* CATEGORIES */}
        <aside className="rounded-2xl border border-white/10 bg-[#141719] p-4 sm:p-5">

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-black">
                CATEGORIES
              </h3>

              <p className="mt-1 text-xs text-gray-500">
                {menuCategories.length} categories
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-2">
            {menuCategories.length === 0 ? (
              <div className="rounded-xl bg-[#1a1e21] p-4 text-sm text-gray-500">
                No categories found.
              </div>
            ) : (
              menuCategories.map((category) => (
                <div
                  key={category.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/5 bg-[#1a1e21] p-4"
                >
                  <div>
                    <p className="font-bold">
                      {category.name}
                    </p>

                    <p className="mt-1 text-xs text-gray-500">
                      Order #{category.display_order}
                    </p>
                  </div>

                  <span
                    className={`rounded-lg px-2 py-1 text-[10px] font-black uppercase ${
                      category.active
                        ? "bg-green-500/10 text-green-400"
                        : "bg-gray-500/10 text-gray-500"
                    }`}
                  >
                    {category.active
                      ? "Active"
                      : "Inactive"}
                  </span>
                </div>
              ))
            )}
          </div>

        </aside>

        {/* DISHES */}
        <section className="rounded-2xl border border-white/10 bg-[#141719] p-4 sm:p-5">

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-black">
                MENU ITEMS
              </h3>

              <p className="mt-1 text-xs text-gray-500">
                {menuItems.length} dishes
              </p>
            </div>

            <div className="flex w-full flex-wrap items-center gap-2 sm:gap-3 lg:w-auto lg:justify-end">

  <div className="rounded-lg bg-red-500/10 px-3 py-2 text-xs font-bold text-red-400">
    {menuItems.filter((item) => item.active).length} Active
  </div>

  <button
    onClick={() => setShowAddDish(true)}
    className="rounded-lg bg-red-600 px-4 py-2 text-xs font-black text-white hover:bg-red-700"
  >
    + Add Dish
  </button>

</div>
          </div>

          <div className="mt-5 space-y-3">

            {menuItems.length === 0 ? (
              <div className="rounded-xl bg-[#1a1e21] p-8 text-center text-gray-500">
                No menu items found.
              </div>
            ) : (
              menuItems.map((item) => {

                const category =
                  menuCategories.find(
                    (category) =>
                      category.id === item.category_id
                  );

                return (
                  <div
                    key={item.id}
                    className="grid grid-cols-1 gap-4 rounded-2xl border border-white/5 bg-[#1a1e21] p-4 sm:grid-cols-2 md:grid-cols-[minmax(0,1fr)_120px_100px_minmax(180px,auto)]"
                  >

                    {/* NAME */}
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-black">
                          {item.name}
                        </p>

                        {item.vegetarian && (
                          <span className="rounded-md bg-green-500/10 px-2 py-1 text-[10px] font-black text-green-400">
                            VEG
                          </span>
                        )}
                      </div>

                      <p className="mt-1 text-xs text-gray-500">
                        {category?.name ||
                          "No Category"}
                      </p>

                      {item.description && (
                        <p className="mt-2 line-clamp-2 text-xs text-gray-400">
                          {item.description}
                        </p>
                      )}
                    </div>

                    {/* STATION */}
                    <div>
                      <p className="text-xs text-gray-500">
                        Station
                      </p>

                      <p className="mt-1 font-bold capitalize">
                        {item.station}
                      </p>
                    </div>

                    {/* PRICE */}
                    <div>
                      <p className="text-xs text-gray-500">
                        Price
                      </p>

                      <p className="mt-1 font-black text-red-500">
                        {settings.currencySymbol}
                        {item.price.toFixed(2)}
                      </p>
                    </div>

                    {/* STATUS */}
                    <div className="md:text-right">
  <p className="text-xs text-gray-500">
    Status
  </p>

  <p
    className={`mt-1 font-bold ${
      item.active
        ? "text-green-400"
        : "text-red-400"
    }`}
  >
    {item.active
      ? "Available"
      : "SOLD OUT"}
  </p>

  <div className="mt-3 flex flex-wrap gap-2 md:justify-end">
    <button
      onClick={() => toggleDishAvailability(item)}
      className={`rounded-lg border px-3 py-2 text-xs font-black transition ${
        item.active
          ? "border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-600 hover:text-white"
          : "border-green-500/30 bg-green-500/10 text-green-400 hover:bg-green-600 hover:text-white"
      }`}
    >
      {item.active ? "Mark Sold Out" : "Make Available"}
    </button>

    <button
      onClick={() => setEditingDish(item)}
      className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-black text-white hover:bg-white/10"
    >
      Edit
    </button>
  </div>
</div>

                  </div>
                );
              })
            )}

          </div>

        </section>

      </div>
    </div>
  </div>
)}

{/* EDIT DISH MODAL */}
{editingDish && (
  <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-2 sm:p-5">

    <div className="max-h-[94vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-white/10 bg-[#141719] p-4 sm:p-6">

      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-red-500">
            DINEVO ADMIN
          </p>

          <h2 className="mt-1 text-2xl font-black">
            Edit Dish
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Update menu item details
          </p>
        </div>

        <button
          onClick={() => setEditingDish(null)}
          className="rounded-xl border border-white/10 bg-[#1a1e21] px-4 py-2 font-bold"
        >
          ✕
        </button>
      </div>

      <div className="mt-6 space-y-5">

        <div>
          <label className="text-sm font-bold text-gray-400">
            Dish Name
          </label>

          <input
            value={editingDish.name}
            onChange={(e) =>
              setEditingDish({
                ...editingDish,
                name: e.target.value,
              })
            }
            className="mt-2 w-full rounded-xl border border-white/10 bg-[#1a1e21] px-4 py-3 text-white outline-none focus:border-red-500"
          />
        </div>

        <div>
          <label className="text-sm font-bold text-gray-400">
            Description
          </label>

          <textarea
            rows={3}
            value={editingDish.description || ""}
            onChange={(e) =>
              setEditingDish({
                ...editingDish,
                description: e.target.value,
              })
            }
            className="mt-2 w-full rounded-xl border border-white/10 bg-[#1a1e21] px-4 py-3 text-white outline-none focus:border-red-500"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

          <div>
            <label className="text-sm font-bold text-gray-400">
              Price
            </label>

            <input
              type="number"
              step="0.01"
              min="0"
              value={editingDish.price}
              onChange={(e) =>
                setEditingDish({
                  ...editingDish,
                  price: Number(e.target.value),
                })
              }
              className="mt-2 w-full rounded-xl border border-white/10 bg-[#1a1e21] px-4 py-3 text-white outline-none focus:border-red-500"
            />
          </div>

          <div>
            <label className="text-sm font-bold text-gray-400">
              Category
            </label>

            <select
              value={editingDish.category_id ?? ""}
              onChange={(e) =>
                setEditingDish({
                  ...editingDish,
                  category_id: e.target.value
                    ? Number(e.target.value)
                    : null,
                })
              }
              className="mt-2 w-full rounded-xl border border-white/10 bg-[#1a1e21] px-4 py-3 text-white outline-none focus:border-red-500"
            >
              <option value="">
                Select Category
              </option>

              {menuCategories.map((category) => (
                <option
                  key={category.id}
                  value={category.id}
                >
                  {category.name}
                </option>
              ))}
            </select>
          </div>

        </div>

        <div>
          <label className="text-sm font-bold text-gray-400">
            Image URL
          </label>

          <input
            value={editingDish.image_url || ""}
            onChange={(e) =>
              setEditingDish({
                ...editingDish,
                image_url: e.target.value,
              })
            }
            className="mt-2 w-full rounded-xl border border-white/10 bg-[#1a1e21] px-4 py-3 text-white outline-none focus:border-red-500"
          />
          <div className="mt-3 rounded-xl border border-white/10 bg-[#101214] p-4">
            {editingDish.image_url && (
              <img src={editingDish.image_url} alt={`${editingDish.name} preview`} className="mb-3 h-40 w-full rounded-xl object-cover" />
            )}
            <label className={`flex min-h-11 cursor-pointer items-center justify-center rounded-xl bg-red-600 px-4 py-3 text-sm font-black text-white hover:bg-red-500 ${isUploadingDishImage ? "pointer-events-none opacity-60" : ""}`}>
              {isUploadingDishImage ? "UPLOADING..." : editingDish.image_url ? "CHANGE PHOTO" : "UPLOAD PHOTO"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                disabled={isUploadingDishImage}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadDishImage(file, "edit");
                  e.currentTarget.value = "";
                }}
              />
            </label>
            {editingDish.image_url && (
              <button
                type="button"
                onClick={() => setEditingDish({ ...editingDish, image_url: null })}
                className="mt-2 w-full rounded-xl border border-white/10 px-4 py-2 text-xs font-bold text-gray-400 hover:bg-white/5"
              >
                REMOVE PHOTO
              </button>
            )}
            <p className="mt-2 text-xs text-gray-500">JPG, PNG or WebP · Maximum 5 MB</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

          <div>
            <label className="text-sm font-bold text-gray-400">
              Station
            </label>

            <select
              value={editingDish.station}
              onChange={(e) =>
                setEditingDish({
                  ...editingDish,
                  station: e.target.value as
                    | "kitchen"
                    | "pizza"
                    | "bar",
                })
              }
              className="mt-2 w-full rounded-xl border border-white/10 bg-[#1a1e21] px-4 py-3 text-white outline-none focus:border-red-500"
            >
              <option value="kitchen">
                Kitchen
              </option>

              <option value="pizza">
                Pizza
              </option>

              <option value="bar">
                Bar
              </option>
            </select>
          </div>

          <div>
            <label className="text-sm font-bold text-gray-400">
              Vegetarian
            </label>

            <button
              type="button"
              onClick={() =>
                setEditingDish({
                  ...editingDish,
                  vegetarian:
                    !editingDish.vegetarian,
                })
              }
              className={`mt-2 w-full rounded-xl border px-4 py-3 font-bold ${
                editingDish.vegetarian
                  ? "border-green-500/40 bg-green-500/10 text-green-400"
                  : "border-white/10 bg-[#1a1e21] text-gray-400"
              }`}
            >
              {editingDish.vegetarian
                ? "Yes"
                : "No"}
            </button>
          </div>

        </div>

        <div>
          <label className="text-sm font-bold text-gray-400">
            Status
          </label>

          <button
            type="button"
            onClick={() =>
              setEditingDish({
                ...editingDish,
                active: !editingDish.active,
              })
            }
            className={`mt-2 w-full rounded-xl border px-4 py-3 font-bold ${
              editingDish.active
                ? "border-green-500/40 bg-green-500/10 text-green-400"
                : "border-red-500/40 bg-red-500/10 text-red-400"
            }`}
          >
            {editingDish.active
              ? "Active"
              : "Inactive"}
          </button>
        </div>

      </div>

      <div className="mt-7 flex gap-3">

        <button
          onClick={() => setEditingDish(null)}
          className="flex-1 rounded-xl border border-white/10 py-3 font-bold"
        >
          Cancel
        </button>

        <button
  onClick={saveEditedDish}
  className="flex-1 rounded-xl bg-red-600 py-3 font-black hover:bg-red-700"
>
  Save Changes
</button>

      </div>

    </div>
  </div>
)}

{/* ADD DISH MODAL */}
{showAddDish && (
  <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-5">

    <div className="max-h-[94vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-white/10 bg-[#141719] p-4 sm:p-6">

      <div className="flex items-start justify-between">

        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-red-500">
            DINEVO ADMIN
          </p>

          <h2 className="mt-1 text-2xl font-black">
            Add New Dish
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Create a new menu item
          </p>
        </div>

        <button
          onClick={() => setShowAddDish(false)}
          className="rounded-xl border border-white/10 bg-[#1a1e21] px-4 py-2 font-bold"
        >
          ✕
        </button>

      </div>

      <div className="mt-6 space-y-5">

        <div>
          <label className="text-sm font-bold text-gray-400">
            Dish Name
          </label>

          <input
            value={newDishName}
            onChange={(e) =>
              setNewDishName(e.target.value)
            }
            placeholder="Example: Chicken Burger"
            className="mt-2 w-full rounded-xl border border-white/10 bg-[#1a1e21] px-4 py-3 text-white outline-none focus:border-red-500"
          />
        </div>

        <div>
          <label className="text-sm font-bold text-gray-400">
            Description
          </label>

          <textarea
            value={newDishDescription}
            onChange={(e) =>
              setNewDishDescription(e.target.value)
            }
            placeholder="Short dish description"
            rows={3}
            className="mt-2 w-full rounded-xl border border-white/10 bg-[#1a1e21] px-4 py-3 text-white outline-none focus:border-red-500"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

          <div>
            <label className="text-sm font-bold text-gray-400">
              Price
            </label>

            <input
              type="number"
              step="0.01"
              min="0"
              value={newDishPrice}
              onChange={(e) =>
                setNewDishPrice(e.target.value)
              }
              placeholder="12.90"
              className="mt-2 w-full rounded-xl border border-white/10 bg-[#1a1e21] px-4 py-3 text-white outline-none focus:border-red-500"
            />
          </div>

          <div>
            <label className="text-sm font-bold text-gray-400">
              Category
            </label>

            <select
              value={newDishCategoryId ?? ""}
              onChange={(e) =>
                setNewDishCategoryId(
                  e.target.value
                    ? Number(e.target.value)
                    : null
                )
              }
              className="mt-2 w-full rounded-xl border border-white/10 bg-[#1a1e21] px-4 py-3 text-white outline-none focus:border-red-500"
            >
              <option value="">
                Select Category
              </option>

              {menuCategories
                .filter((category) => category.active)
                .map((category) => (
                  <option
                    key={category.id}
                    value={category.id}
                  >
                    {category.name}
                  </option>
                ))}
            </select>
          </div>

        </div>

        <div>
          <label className="text-sm font-bold text-gray-400">
            Image URL
          </label>

          <input
            value={newDishImageUrl}
            onChange={(e) =>
              setNewDishImageUrl(e.target.value)
            }
            placeholder="https://..."
            className="mt-2 w-full rounded-xl border border-white/10 bg-[#1a1e21] px-4 py-3 text-white outline-none focus:border-red-500"
          />
          <div className="mt-3 rounded-xl border border-white/10 bg-[#101214] p-4">
            {newDishImageUrl && (
              <img src={newDishImageUrl} alt="Dish preview" className="mb-3 h-40 w-full rounded-xl object-cover" />
            )}
            <label className={`flex min-h-11 cursor-pointer items-center justify-center rounded-xl bg-red-600 px-4 py-3 text-sm font-black text-white hover:bg-red-500 ${isUploadingDishImage ? "pointer-events-none opacity-60" : ""}`}>
              {isUploadingDishImage ? "UPLOADING..." : newDishImageUrl ? "CHANGE PHOTO" : "UPLOAD PHOTO"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                disabled={isUploadingDishImage}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadDishImage(file, "new");
                  e.currentTarget.value = "";
                }}
              />
            </label>
            {newDishImageUrl && (
              <button type="button" onClick={() => setNewDishImageUrl("")} className="mt-2 w-full rounded-xl border border-white/10 px-4 py-2 text-xs font-bold text-gray-400 hover:bg-white/5">
                REMOVE PHOTO
              </button>
            )}
            <p className="mt-2 text-xs text-gray-500">JPG, PNG or WebP · Maximum 5 MB</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

          <div>
            <label className="text-sm font-bold text-gray-400">
              Station
            </label>

            <select
              value={newDishStation}
              onChange={(e) =>
                setNewDishStation(
                  e.target.value as
                    | "kitchen"
                    | "pizza"
                    | "bar"
                )
              }
              className="mt-2 w-full rounded-xl border border-white/10 bg-[#1a1e21] px-4 py-3 text-white outline-none focus:border-red-500"
            >
              <option value="kitchen">
                Kitchen
              </option>

              <option value="pizza">
                Pizza
              </option>

              <option value="bar">
                Bar
              </option>
            </select>
          </div>

          <div>
            <label className="text-sm font-bold text-gray-400">
              Vegetarian
            </label>

            <button
              type="button"
              onClick={() =>
                setNewDishVegetarian(
                  !newDishVegetarian
                )
              }
              className={`mt-2 w-full rounded-xl border px-4 py-3 font-bold ${
                newDishVegetarian
                  ? "border-green-500/40 bg-green-500/10 text-green-400"
                  : "border-white/10 bg-[#1a1e21] text-gray-400"
              }`}
            >
              {newDishVegetarian
                ? "Yes"
                : "No"}
            </button>
          </div>

        </div>

      </div>

      <div className="mt-7 flex gap-3">

        <button
          onClick={() => setShowAddDish(false)}
          className="flex-1 rounded-xl border border-white/10 py-3 font-bold"
        >
          Cancel
        </button>

       <button
  onClick={addDish}
  className="flex-1 rounded-xl bg-red-600 py-3 font-black hover:bg-red-700"
>
  Add Dish
</button>

      </div>

    </div>
  </div>
)}

      {/* SETTINGS MODAL */}

      {showSettings && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-5">

          <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#141719] p-6">

            <div className="flex items-start justify-between">

              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-red-500">
                  DINEVO ADMIN
                </p>

                <h2 className="mt-2 text-2xl font-black">
                  Restaurant Settings
                </h2>
              </div>

              <button
                onClick={() => setShowSettings(false)}
                className="rounded-xl bg-[#1a1e21] px-4 py-2 font-bold"
              >
                ✕
              </button>

            </div>

            <div className="mt-6 space-y-5">

              {/* NAME */}

              <div>
                <label className="text-sm font-bold text-gray-400">
                  Restaurant Name
                </label>

                <input
                  value={draftSettings.restaurantName}
                  onChange={(e) =>
                    setDraftSettings((current) => ({
                      ...current,
                      restaurantName: e.target.value,
                    }))
                  }
                  className="mt-2 w-full rounded-xl border border-white/10 bg-[#1a1e21] px-4 py-3 text-white outline-none focus:border-red-500"
                />
              </div>

              {/* TAX */}

              <div>
                <label className="text-sm font-bold text-gray-400">
                  Included Tax %
                </label>

                <input
                  type="number"
                  min="0"
                  max="100"
                  value={draftSettings.taxRate}
                  onChange={(e) =>
                    setDraftSettings((current) => ({
                      ...current,
                      taxRate: Number(e.target.value),
                    }))
                  }
                  className="mt-2 w-full rounded-xl border border-white/10 bg-[#1a1e21] px-4 py-3 text-white outline-none focus:border-red-500"
                />
              </div>

              {/* PREPARATION */}

              <div>
                <label className="text-sm font-bold text-gray-400">
                  Preparation Target (minutes)
                </label>

                <input
                  type="number"
                  min="1"
                  value={draftSettings.preparationTime}
                  onChange={(e) =>
                    setDraftSettings((current) => ({
                      ...current,
                      preparationTime: Number(e.target.value),
                    }))
                  }
                  className="mt-2 w-full rounded-xl border border-white/10 bg-[#1a1e21] px-4 py-3 text-white outline-none focus:border-red-500"
                />
              </div>

              {/* CURRENCY */}

              <div>
                <label className="text-sm font-bold text-gray-400">
                  Currency
                </label>

                <select
                  value={draftSettings.currency}
                  onChange={(e) =>
                    changeCurrency(e.target.value)
                  }
                  className="mt-2 w-full rounded-xl border border-white/10 bg-[#1a1e21] px-4 py-3 text-white outline-none focus:border-red-500"
                >
                  <option value="EUR">
                    EUR — €
                  </option>

                  <option value="USD">
                    USD — $
                  </option>

                  <option value="GBP">
                    GBP — £
                  </option>
                </select>
              </div>

            </div>

            <div className="mt-7 flex gap-3">

              <button
                onClick={() => setShowSettings(false)}
                className="flex-1 rounded-xl border border-white/10 py-3 font-bold"
              >
                Cancel
              </button>

              <button
                onClick={saveSettings}
                className="flex-1 rounded-xl bg-red-600 py-3 font-black hover:bg-red-700"
              >
                Save Settings
              </button>

            </div>

          </div>

        </div>

      )}

    </main>
    </StaffGuard>
  );
}