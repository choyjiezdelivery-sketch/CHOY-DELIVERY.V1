/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from "react";
import {
  X,
  ShoppingCart,
  Store,
  Bike,
  Bell,
  Search,
  CheckCircle,
  Clock,
  MapPin,
  Trash2,
  Terminal,
  Volume2,
  ZoomIn,
  ZoomOut,
  Plus,
  User,
  LogOut,
  Upload,
} from "lucide-react";
import {
  auth,
  db,
  googleProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  testConnection,
  firestoreDatabaseId,
  firebaseProjectId,
  OperationType,
  handleFirestoreError,
} from "./lib/firebase";
import { collection, addDoc, updateDoc, doc } from "firebase/firestore";

type Role = "customer" | "rider" | "store" | "admin";

type OrderStatus =
  | "Customer Pick Order"
  | "Admin Approve Order"
  | "Store Accept Order"
  | "Rider Get Order"
  | "Food is Ready"
  | "Rider Pick Up"
  | "Rider On The Way"
  | "Customer Receive & Proof of Delivery";

const ORDER_STEPS: OrderStatus[] = [
  "Customer Pick Order",
  "Admin Approve Order",
  "Store Accept Order",
  "Rider Get Order",
  "Food is Ready",
  "Rider Pick Up",
  "Rider On The Way",
  "Customer Receive & Proof of Delivery",
];

interface Product {
  id: string;
  name: string;
  price: number;
  store: string;
  category: string;
  available: boolean;
  image: string;
}

interface StoreEntry {
  name: string;
  category: string;
  categoryId: string;
  rating: string;
  time: string;
  distanceKm: number;
  image: string;
}

interface OrderItem {
  id: string;
  firestoreDocId?: string;
  customerName: string;
  storeName: string;
  items: string[];
  total: number;
  status: OrderStatus;
  proofUploaded?: boolean;
  createdAt: string;
}

const STORES: StoreEntry[] = [
  {
    name: "Jollibee",
    category: "Fast Food · Chicken & Burgers",
    categoryId: "food",
    rating: "4.9",
    time: "15-25 mins",
    distanceKm: 1.8,
    image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=600&q=80",
  },
  {
    name: "Choy's Kitchen",
    category: "Filipino · Rice Meals & Lechon",
    categoryId: "food",
    rating: "4.8",
    time: "20-30 mins",
    distanceKm: 2.4,
    image: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=600&q=80",
  },
  {
    name: "Metro Supermarket",
    category: "Groceries & Daily Essentials",
    categoryId: "grocery",
    rating: "4.8",
    time: "30-45 mins",
    distanceKm: 2.7,
    image: "https://images.unsplash.com/photo-1550989460-0adf9ea622e2?auto=format&fit=crop&w=600&q=80",
  },
  {
    name: "Carbon Public Market",
    category: "Fresh Produce & Meat",
    categoryId: "market",
    rating: "4.7",
    time: "35-50 mins",
    distanceKm: 3.0,
    image: "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80",
  },
  {
    name: "Rose Pharmacy",
    category: "Medicines & Healthcare",
    categoryId: "pharmacy",
    rating: "4.9",
    time: "20-30 mins",
    distanceKm: 1.5,
    image: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=600&q=80",
  },
  {
    name: "Ayala Center Mall Hub",
    category: "Mall Retail & Electronics",
    categoryId: "mall",
    rating: "4.8",
    time: "25-40 mins",
    distanceKm: 2.9,
    image: "https://images.unsplash.com/photo-1519567241046-7f570eee3ce6?auto=format&fit=crop&w=600&q=80",
  },
];

const INITIAL_PRODUCTS: Product[] = [
  {
    id: "p1",
    name: "Chickenjoy Value Meal",
    price: 89,
    store: "Jollibee",
    category: "food",
    available: true,
    image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "p2",
    name: "Jolly Spaghetti",
    price: 99,
    store: "Jollibee",
    category: "food",
    available: true,
    image: "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "p3",
    name: "Palabok Fiesta",
    price: 109,
    store: "Jollibee",
    category: "food",
    available: true,
    image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "p4",
    name: "Cebu Lechon Belly Meal",
    price: 185,
    store: "Choy's Kitchen",
    category: "food",
    available: true,
    image: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "p5",
    name: "Fresh Milk & Bread Bundle",
    price: 145,
    store: "Metro Supermarket",
    category: "grocery",
    available: true,
    image: "https://images.unsplash.com/photo-1550989460-0adf9ea622e2?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "p6",
    name: "Fresh Organic Vegetables Pack",
    price: 120,
    store: "Carbon Public Market",
    category: "market",
    available: true,
    image: "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "p7",
    name: "Vitamin C 500mg (Box)",
    price: 250,
    store: "Rose Pharmacy",
    category: "pharmacy",
    available: true,
    image: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "p8",
    name: "Fast USB-C Travel Charger",
    price: 399,
    store: "Ayala Center Mall Hub",
    category: "mall",
    available: true,
    image: "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=600&q=80",
  },
];

export default function App() {
  const [role, setRole] = useState<Role>("customer");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [selectedStore, setSelectedStore] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [cart, setCart] = useState<{ product: Product; quantity: number }[]>([]);
  const [walletBalance, setWalletBalance] = useState(420.0);
  const [rewardPoints, setRewardPoints] = useState(1240);
  const [spinTickets, setSpinTickets] = useState(3);

  // Panels & Modals
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [activeSidePanel, setActiveSidePanel] = useState<
    "vouchers" | "games" | "map" | "notifications" | null
  >(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [deliveryAddress, setDeliveryAddress] = useState("IT Park, Skyrise 4, Cebu City");
  const [deliveryFee, setDeliveryFee] = useState(25);
  const [riderTip, setRiderTip] = useState(0);

  // Store new product inputs
  const [newProductName, setNewProductName] = useState("");
  const [newProductPrice, setNewProductPrice] = useState("");
  const [newProductStore, setNewProductStore] = useState("Jollibee");

  // Rider 60s timer & proof photo
  const [riderCountdown, setRiderCountdown] = useState(60);
  const [proofFileName, setProofFileName] = useState<string | null>(null);

  // Notifications
  const [notifications, setNotifications] = useState<string[]>([
    "Welcome to ChoyJiez Delivery! 3km live map tracing enabled.",
    "Order #CJ-9041 is ready for Admin Approval.",
  ]);

  // Admin section state
  const [adminSection, setAdminSection] = useState("overview");

  // Orders state for full 8-step order flow
  const [orders, setOrders] = useState<OrderItem[]>([
    {
      id: "CJ-9041",
      customerName: "Juan Customer",
      storeName: "Jollibee",
      items: ["Chickenjoy Value Meal x2", "Jolly Spaghetti x1"],
      total: 277,
      status: "Customer Pick Order",
      createdAt: "Just now",
    },
  ]);

  // Firebase state
  const [firebaseUser, setFirebaseUser] = useState<any>(null);
  const [dbConnected, setDbConnected] = useState(false);
  const [renderStatus, setRenderStatus] = useState<string>("Checking...");
  const [terminalInput, setTerminalInput] = useState("");
  const [terminalLogs, setTerminalLogs] = useState<string[]>([
    `ChoyJiez Terminal v2.5 · Firestore DB: ${firestoreDatabaseId}`,
    "Type 'help' to view available commands ('health', 'config', 'status', 'orders', 'role admin').",
  ]);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Chat messages
  const [chatMessages, setChatMessages] = useState<{ sender: "user" | "bot"; text: string }[]>([
    { sender: "bot", text: "Hi! I am Choy AI. Ask me about stores, vouchers, or your 3km delivery!" },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  // Search filter
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    testConnection().then((ok) => setDbConnected(ok));
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
    });
    fetch("/api/health")
      .then((res) => res.json())
      .then((data) => setRenderStatus(data.status === "ok" ? `Online (${data.host})` : "Local"))
      .catch(() => setRenderStatus("Local"));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setRiderCountdown((prev) => (prev > 0 ? prev - 1 : 60));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [terminalLogs]);

  // Web Audio API chime/beep for every accept/approve/action click
  const playBeep = (type: "approve" | "click" | "delete" = "click") => {
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioCtx = new AudioContextClass();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type === "approve" ? "triangle" : "sine";

      const now = audioCtx.currentTime;
      if (type === "approve") {
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
        osc.frequency.setValueAtTime(783.99, now + 0.16); // G5
        gain.gain.setValueAtTime(0.14, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
        osc.start(now);
        osc.stop(now + 0.28);
      } else if (type === "delete") {
        osc.frequency.setValueAtTime(320, now);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
        osc.start(now);
        osc.stop(now + 0.14);
      } else {
        osc.frequency.setValueAtTime(587.33, now);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.12);
      }
    } catch {
      // Ignore if AudioContext is blocked
    }
  };

  const showToast = (msg: string, tone: "approve" | "click" | "delete" = "click") => {
    setToastMessage(msg);
    playBeep(tone);
    setTimeout(() => setToastMessage(null), 3200);
  };

  const addNotification = (msg: string) => {
    setNotifications((prev) => [`${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · ${msg}`, ...prev]);
  };

  const handleGoogleLogin = async () => {
    playBeep("click");
    try {
      const res = await signInWithPopup(auth, googleProvider);
      setFirebaseUser(res.user);
      showToast(`Signed in as ${res.user.displayName || res.user.email}`, "approve");
    } catch {
      setFirebaseUser({ displayName: "Juan Customer", email: "choycounterflow@gmail.com" });
      showToast("Signed in (Demo profile active)", "approve");
    }
  };

  const handleLogout = async () => {
    playBeep("click");
    try {
      await signOut(auth);
    } catch {
      // ignore
    }
    setFirebaseUser(null);
    showToast("Signed out.");
  };

  const handleAddToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    showToast(`Added ${product.name} to cart.`, "approve");
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
    showToast("Item deleted from cart.", "delete");
  };

  const handleDeleteOrder = (orderId: string) => {
    setOrders((prev) => prev.filter((o) => o.id !== orderId));
    addNotification(`Order ${orderId} deleted.`);
    showToast(`Order ${orderId} deleted.`, "delete");
  };

  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    const target = orders.find((o) => o.id === orderId);
    setOrders((prev) =>
      prev.map((ord) =>
        ord.id === orderId
          ? {
              ...ord,
              status: newStatus,
              proofUploaded:
                newStatus === "Customer Receive & Proof of Delivery" ? true : ord.proofUploaded,
            }
          : ord
      )
    );
    addNotification(`Order ${orderId}: ${newStatus}`);
    showToast(`Order ${orderId} → ${newStatus}`, "approve");

    if (target?.firestoreDocId && auth.currentUser) {
      try {
        await updateDoc(doc(db, "orders", target.firestoreDocId), { status: newStatus });
      } catch (err) {
        try {
          handleFirestoreError(err, OperationType.UPDATE, `orders/${target.firestoreDocId}`);
        } catch {
          // Handled gracefully in UI
        }
      }
    }
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;
    const userMsg = chatInput.trim();
    setChatMessages((prev) => [...prev, { sender: "user", text: userMsg }]);
    setChatInput("");
    setChatLoading(true);
    playBeep("click");

    try {
      const res = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg }),
      });
      const data = await res.json();
      if (!res.ok) {
        setChatMessages((prev) => [
          ...prev,
          { sender: "bot", text: `Server info: ${data.error || "Check GEMINI_API_KEY in Render Environment."}` },
        ]);
      } else {
        setChatMessages((prev) => [...prev, { sender: "bot", text: data.text || "Salamat!" }]);
      }
    } catch {
      setChatMessages((prev) => [
        ...prev,
        { sender: "bot", text: "Unable to reach Ask Choy server right now." },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleTerminalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!terminalInput.trim()) return;
    const raw = terminalInput.trim();
    const cmd = raw.toLowerCase();
    setTerminalLogs((prev) => [...prev, `> ${raw}`]);
    setTerminalInput("");
    playBeep("click");

    if (cmd === "help") {
      setTerminalLogs((prev) => [
        ...prev,
        "Commands:",
        "  health         - Check Render /api/health endpoint",
        "  config         - Inspect Render /api/config values",
        "  status         - Check Firebase Firestore & Auth status",
        "  orders         - List active orders & current step",
        "  wallet         - View Choy Wallet & reward points",
        "  role <name>    - Switch role (customer, rider, store, admin)",
        "  clear / exit   - Clear logs or close terminal",
      ]);
    } else if (cmd === "health") {
      try {
        const res = await fetch("/api/health");
        const data = await res.json();
        setTerminalLogs((prev) => [...prev, JSON.stringify(data, null, 2)]);
      } catch {
        setTerminalLogs((prev) => [...prev, "Failed to fetch /api/health"]);
      }
    } else if (cmd === "config") {
      try {
        const res = await fetch("/api/config");
        const data = await res.json();
        setTerminalLogs((prev) => [...prev, JSON.stringify(data, null, 2)]);
      } catch {
        setTerminalLogs((prev) => [...prev, "Failed to fetch /api/config"]);
      }
    } else if (cmd === "status") {
      setTerminalLogs((prev) => [
        ...prev,
        `Firebase Project: ${firebaseProjectId}`,
        `Firestore DB: ${firestoreDatabaseId} (${dbConnected ? "Connected" : "Offline"})`,
        `Render Status: ${renderStatus}`,
        `User: ${firebaseUser ? firebaseUser.email : "Guest"}`,
      ]);
    } else if (cmd === "orders") {
      setTerminalLogs((prev) => [
        ...prev,
        ...orders.map((o) => `${o.id} | ${o.storeName} | ₱${o.total} | ${o.status}`),
      ]);
    } else if (cmd === "wallet") {
      setTerminalLogs((prev) => [
        ...prev,
        `Wallet: ₱${walletBalance.toFixed(2)} | Points: ${rewardPoints}`,
      ]);
    } else if (cmd.startsWith("role ")) {
      const r = cmd.split(" ")[1] as Role;
      if (["customer", "rider", "store", "admin"].includes(r)) {
        setRole(r);
        setTerminalLogs((prev) => [...prev, `Switched to ${r} dashboard.`]);
      } else {
        setTerminalLogs((prev) => [...prev, "Invalid role. Use customer, rider, store, or admin."]);
      }
    } else if (cmd === "clear") {
      setTerminalLogs([`ChoyJiez Terminal v2.5 · Firestore DB: ${firestoreDatabaseId}`]);
    } else if (cmd === "exit") {
      setTerminalOpen(false);
    } else {
      setTerminalLogs((prev) => [...prev, `Unknown command: '${cmd}'. Type 'help'.`]);
    }
  };

  const filteredStores = STORES.filter(
    (s) =>
      (activeCategory === "all" || s.categoryId === activeCategory) &&
      (s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.category.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredProducts = products.filter(
    (p) =>
      (!selectedStore || p.store === selectedStore) &&
      (activeCategory === "all" || selectedStore !== null || p.category === activeCategory) &&
      (p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.store.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const activeOrder = orders[0];

  return (
    <div className="min-h-screen bg-[#f5f9f6] text-slate-900 font-sans selection:bg-emerald-600 selection:text-white">
      {/* Topbar */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-white px-4 md:px-6 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              playBeep("click");
              setRole("customer");
              setSelectedStore(null);
            }}
            className="flex items-center gap-2 text-left"
          >
            <span className="text-2xl">🛵</span>
            <div>
              <b className="text-lg font-black tracking-tight text-emerald-900">
                <i>ChoyJiez</i> DELIVERY
              </b>
              <span className="block text-[10px] font-bold text-emerald-600 uppercase tracking-widest">
                3km Live Tracing · {renderStatus}
              </span>
            </div>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              playBeep("click");
              setTerminalOpen(true);
            }}
            className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-emerald-400 hover:bg-slate-800"
          >
            <Terminal size={14} /> <span className="hidden sm:inline">Terminal</span>
          </button>

          {firebaseUser ? (
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-900 hover:bg-emerald-100"
              title="Sign out"
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">{firebaseUser.displayName || "Signed In"}</span>
            </button>
          ) : (
            <button
              onClick={handleGoogleLogin}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700"
            >
              <User size={14} /> <span className="hidden sm:inline">Sign In</span>
            </button>
          )}

          <button
            onClick={() => {
              playBeep("click");
              setActiveSidePanel("notifications");
            }}
            className="relative rounded-xl p-2 text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="Notifications"
          >
            <Bell size={20} />
            {notifications.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white">
                {notifications.length}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Role Switcher */}
      <nav className="flex flex-wrap justify-center gap-2 border-b bg-white py-3 px-4 shadow-sm">
        {(["customer", "rider", "store", "admin"] as Role[]).map((r) => (
          <button
            key={r}
            onClick={() => {
              playBeep("click");
              setRole(r);
            }}
            className={`flex items-center gap-2 rounded-full px-5 py-2 text-sm font-bold capitalize transition-all ${
              role === r
                ? "bg-[#104a25] text-white shadow-md shadow-emerald-900/20"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <span>{r === "customer" ? "▣" : r === "rider" ? "♧" : r === "store" ? "▤" : "◇"}</span>
            {r} Dashboard
          </button>
        ))}
      </nav>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl p-4 md:p-8" id="top">
        {/* =================================================================== */}
        {/* CUSTOMER VIEW */}
        {/* =================================================================== */}
        {role === "customer" && (
          <div className="space-y-8">
            {/* Promo Banner */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-900 to-emerald-800 p-8 text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div>
                <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold uppercase tracking-wider">
                  Today's Promo
                </span>
                <h2 className="mt-3 text-3xl font-black md:text-4xl">
                  Good food, delivered with a smile.
                </h2>
                <p className="mt-2 text-emerald-100 text-sm md:text-base">
                  All What You Want · Live 3km Leaflet-style route tracing & instant audio alerts.
                </p>
              </div>
              <button
                onClick={() => {
                  playBeep("click");
                  setActiveSidePanel("map");
                }}
                className="rounded-2xl bg-white px-5 py-3 text-sm font-black text-emerald-900 shadow-lg hover:bg-emerald-50 whitespace-nowrap"
              >
                📍 Open 3km Live Map
              </button>
            </div>

            {/* Search Bar & Location */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold text-emerald-700 uppercase tracking-widest">
                  WHAT ARE YOU LOOKING FOR?
                </span>
                <h1 className="text-3xl font-black text-slate-900">Order from nearby</h1>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 rounded-2xl border bg-white px-4 py-2.5 shadow-sm w-full md:w-80">
                  <Search size={18} className="text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search stores or items..."
                    className="w-full bg-transparent text-sm outline-none"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="text-slate-400 hover:text-slate-700"
                      aria-label="Clear search"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
                <button
                  onClick={() => {
                    playBeep("click");
                    setCheckoutOpen(true);
                  }}
                  className="rounded-2xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-md flex items-center gap-2"
                >
                  <ShoppingCart size={16} /> Cart ({cart.reduce((s, i) => s + i.quantity, 0)})
                </button>
              </div>
            </div>

            {/* Categories */}
            <div className="flex gap-3 overflow-x-auto pb-2">
              {[
                { id: "all", icon: "✨", label: "All Stores" },
                { id: "food", icon: "🍔", label: "Food" },
                { id: "grocery", icon: "🛒", label: "Grocery" },
                { id: "market", icon: "🥬", label: "Public Market" },
                { id: "pharmacy", icon: "💊", label: "Pharmacy" },
                { id: "mall", icon: "🛍️", label: "Mall" },
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => {
                    playBeep("click");
                    setActiveCategory(cat.id);
                    setSelectedStore(null);
                  }}
                  className={`flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold whitespace-nowrap transition-all shadow-sm ${
                    activeCategory === cat.id
                      ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                      : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200"
                  }`}
                >
                  <span className="text-lg">{cat.icon}</span>
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Store List or Selected Store Menu */}
            {!selectedStore ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-xs font-bold text-emerald-700 uppercase tracking-widest">
                      PICK A STORE
                    </span>
                    <h2 className="text-2xl font-black">
                      Popular stores near you (Click any store name)
                    </h2>
                  </div>
                </div>
                {filteredStores.length === 0 ? (
                  <div className="rounded-3xl bg-white p-8 text-center text-slate-500 border">
                    No stores matched "{searchQuery}".
                  </div>
                ) : (
                  <div className="grid gap-6 md:grid-cols-3">
                    {filteredStores.map((store) => (
                      <div
                        key={store.name}
                        className="overflow-hidden rounded-3xl bg-white shadow-sm border border-slate-200 hover:shadow-xl transition-all"
                      >
                        <div
                          className="relative h-44 overflow-hidden cursor-pointer bg-emerald-50"
                          onClick={() => {
                            playBeep("click");
                            setSelectedStore(store.name);
                          }}
                        >
                          <img
                            src={store.image}
                            alt={store.name}
                            referrerPolicy="no-referrer"
                            className="h-full w-full object-cover hover:scale-105 transition-transform duration-500"
                          />
                          <span className="absolute top-4 right-4 rounded-full bg-white/90 px-3 py-1 text-xs font-bold shadow">
                            ★ {store.rating}
                          </span>
                        </div>
                        <div className="p-5">
                          <p className="text-xs text-emerald-700 font-semibold">{store.category}</p>
                          {/* Every store name is a clickable button */}
                          <button
                            onClick={() => {
                              playBeep("click");
                              setSelectedStore(store.name);
                            }}
                            className="mt-1 text-lg font-black text-left text-emerald-900 hover:text-emerald-600 hover:underline flex items-center gap-1"
                          >
                            {store.name} <span>↗</span>
                          </button>
                          <p className="mt-2 text-xs text-slate-500 flex items-center gap-1">
                            <Clock size={13} /> {store.time} · {store.distanceKm} km (within 3km line)
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex flex-wrap justify-between items-center gap-3">
                  <div>
                    <span className="text-xs font-bold text-emerald-700 uppercase tracking-widest">
                      STORE MENU
                    </span>
                    <h2 className="text-2xl font-black">{selectedStore}</h2>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        playBeep("click");
                        setSelectedStore(null);
                      }}
                      className="rounded-xl bg-slate-200 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-300"
                    >
                      ← All Stores
                    </button>
                    <button
                      onClick={() => {
                        playBeep("click");
                        setCheckoutOpen(true);
                      }}
                      className="rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-md flex items-center gap-2"
                    >
                      🛒 Checkout ({cart.reduce((s, i) => s + i.quantity, 0)})
                    </button>
                  </div>
                </div>

                <div className="grid gap-6 md:grid-cols-3">
                  {filteredProducts.map((prod) => (
                    <div
                      key={prod.id}
                      className="rounded-3xl bg-white p-5 shadow-sm border border-slate-200 space-y-3"
                    >
                      <img
                        src={prod.image}
                        alt={prod.name}
                        referrerPolicy="no-referrer"
                        className="h-40 w-full object-cover rounded-2xl bg-emerald-50"
                      />
                      <div>
                        <button
                          onClick={() => {
                            playBeep("click");
                            setSelectedStore(prod.store);
                          }}
                          className="text-xs font-bold text-emerald-700 hover:underline"
                        >
                          {prod.store}
                        </button>
                        <h4 className="font-bold text-lg">{prod.name}</h4>
                      </div>
                      <div className="flex justify-between items-center pt-2">
                        <span className="text-xl font-black text-emerald-800">₱{prod.price}</span>
                        <button
                          disabled={!prod.available}
                          onClick={() => handleAddToCart(prod)}
                          className={`rounded-xl px-4 py-2 text-xs font-bold text-white shadow ${
                            prod.available
                              ? "bg-emerald-600 hover:bg-emerald-700"
                              : "bg-slate-400 cursor-not-allowed"
                          }`}
                        >
                          {prod.available ? "Add to Cart" : "Out of Stock"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Embedded Live Map + Order Flow Tracker */}
            {activeOrder && (
              <div className="rounded-3xl bg-white p-6 md:p-8 shadow-sm border border-slate-200 space-y-6">
                <div className="flex flex-wrap justify-between items-center gap-3">
                  <div>
                    <span className="text-xs font-bold text-emerald-700 uppercase tracking-widest">
                      LIVE ORDER FLOW & 3KM TRACING
                    </span>
                    <h2 className="text-2xl font-black">
                      Order #{activeOrder.id} ·{" "}
                      <button
                        onClick={() => {
                          playBeep("click");
                          setSelectedStore(activeOrder.storeName);
                        }}
                        className="text-emerald-700 hover:underline"
                      >
                        {activeOrder.storeName}
                      </button>
                    </h2>
                  </div>
                  <span className="rounded-full bg-emerald-100 text-emerald-800 px-4 py-1.5 text-xs font-bold">
                    {activeOrder.status}
                  </span>
                </div>

                {/* 8-Step Order Flow Stepper */}
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
                  {ORDER_STEPS.map((step, idx) => {
                    const currentIdx = ORDER_STEPS.indexOf(activeOrder.status);
                    const done = idx <= currentIdx;
                    return (
                      <button
                        key={step}
                        onClick={() => updateOrderStatus(activeOrder.id, step)}
                        className={`rounded-2xl p-3 text-left text-[11px] font-bold transition-all border ${
                          step === activeOrder.status
                            ? "bg-emerald-600 text-white border-emerald-600 shadow-md"
                            : done
                            ? "bg-emerald-50 text-emerald-900 border-emerald-200"
                            : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span>0{idx + 1}</span>
                          {done ? <CheckCircle size={13} /> : <Clock size={13} />}
                        </div>
                        <span className="leading-tight block">{step}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Leaflet-style 3km Live Tracing Map */}
                <LiveTracingMap
                  storeName={activeOrder.storeName}
                  address={deliveryAddress}
                  status={activeOrder.status}
                  onTone={() => playBeep("click")}
                />
              </div>
            )}

            {/* Customer Perks */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-200">
                <span className="text-xs text-slate-500 font-bold uppercase">Choy Wallet</span>
                <p className="mt-2 text-3xl font-black text-emerald-800">
                  ₱{walletBalance.toFixed(2)}
                </p>
                <button
                  onClick={() => {
                    setWalletBalance((b) => b + 200);
                    showToast("Topped up +₱200 to Choy Wallet!", "approve");
                  }}
                  className="mt-3 rounded-xl bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
                >
                  + Top Up ₱200
                </button>
              </div>
              <button
                onClick={() => {
                  playBeep("click");
                  setActiveSidePanel("vouchers");
                }}
                className="rounded-3xl bg-white p-6 shadow-sm border border-slate-200 text-left hover:border-emerald-600 transition-all"
              >
                <span className="text-2xl">🎟️</span>
                <h3 className="font-bold text-lg mt-2">Vouchers</h3>
                <p className="text-xs text-slate-500">10% OFF & Free Delivery</p>
              </button>
              <button
                onClick={() => {
                  playBeep("click");
                  setActiveSidePanel("games");
                }}
                className="rounded-3xl bg-white p-6 shadow-sm border border-slate-200 text-left hover:border-emerald-600 transition-all"
              >
                <span className="text-2xl">🎡</span>
                <h3 className="font-bold text-lg mt-2">JIEZ SPIN ({spinTickets})</h3>
                <p className="text-xs text-slate-500">{rewardPoints} reward points</p>
              </button>
              <button
                onClick={() => {
                  playBeep("click");
                  setActiveSidePanel("map");
                }}
                className="rounded-3xl bg-white p-6 shadow-sm border border-slate-200 text-left hover:border-emerald-600 transition-all"
              >
                <span className="text-2xl">📍</span>
                <h3 className="font-bold text-lg mt-2">3km Live Map</h3>
                <p className="text-xs text-slate-500">Open full tracking drawer</p>
              </button>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* RIDER VIEW */}
        {/* =================================================================== */}
        {role === "rider" && (
          <div className="space-y-8">
            <div className="flex flex-wrap justify-between items-center gap-4">
              <div>
                <span className="text-xs font-bold text-emerald-700 uppercase tracking-widest">
                  RIDER PORTAL · ID: JC-489
                </span>
                <h1 className="text-3xl font-black">
                  Rider workspace (Offer window: {riderCountdown}s)
                </h1>
              </div>
              <span className="rounded-full bg-emerald-100 px-4 py-1.5 text-xs font-bold text-emerald-800">
                ● On Duty · 3km Zone
              </span>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-3xl bg-white p-6 md:p-8 shadow-sm border border-slate-200 space-y-4">
                <span className="text-xs font-bold text-emerald-700 uppercase">
                  RIDER ORDER QUEUE
                </span>
                {orders.length === 0 ? (
                  <p className="text-sm text-slate-500">No active orders.</p>
                ) : (
                  orders.map((ord) => (
                    <div key={ord.id} className="rounded-2xl border p-4 bg-emerald-50/50 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="font-bold">
                          {ord.id} ·{" "}
                          <button
                            onClick={() => {
                              playBeep("click");
                              setRole("customer");
                              setSelectedStore(ord.storeName);
                            }}
                            className="text-emerald-700 hover:underline"
                          >
                            {ord.storeName}
                          </button>
                        </span>
                        <span className="text-xs font-bold text-emerald-700">{ord.status}</span>
                      </div>
                      <p className="text-xs text-slate-600">
                        Customer: {ord.customerName} · {ord.items.join(", ")}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => updateOrderStatus(ord.id, "Rider Get Order")}
                          className="rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow hover:bg-emerald-700"
                        >
                          Rider Get Order ({riderCountdown}s)
                        </button>
                        <button
                          onClick={() => updateOrderStatus(ord.id, "Rider Pick Up")}
                          className="rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white hover:bg-slate-800"
                        >
                          Rider Pick Up
                        </button>
                        <button
                          onClick={() => updateOrderStatus(ord.id, "Rider On The Way")}
                          className="rounded-xl bg-amber-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-amber-700"
                        >
                          On The Way
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="rounded-3xl bg-white p-6 md:p-8 shadow-sm border border-slate-200 space-y-4">
                <span className="text-xs font-bold text-emerald-700 uppercase">
                  PROOF OF DELIVERY & CUSTOMER RECEIVE
                </span>
                <p className="text-xs text-slate-500">
                  Attach proof photo when customer receives the order.
                </p>
                <label className="block border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center cursor-pointer hover:border-emerald-600">
                  <Upload className="mx-auto mb-2 text-emerald-600" size={24} />
                  <p className="text-sm font-bold text-slate-700">
                    {proofFileName
                      ? `Selected: ${proofFileName}`
                      : "Click to upload proof of delivery photo"}
                  </p>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        setProofFileName(f.name);
                        showToast(`Attached proof photo: ${f.name}`, "approve");
                      }
                    }}
                  />
                </label>
                <button
                  onClick={() => {
                    if (orders.length > 0) {
                      updateOrderStatus(orders[0].id, "Customer Receive & Proof of Delivery");
                    } else {
                      showToast("No order to complete.");
                    }
                  }}
                  className="w-full rounded-2xl bg-emerald-600 py-3 font-bold text-white shadow hover:bg-emerald-700"
                >
                  Customer Receive & Submit Proof of Delivery ✓
                </button>
              </div>
            </div>

            {activeOrder && (
              <LiveTracingMap
                storeName={activeOrder.storeName}
                address={deliveryAddress}
                status={activeOrder.status}
                onTone={() => playBeep("click")}
              />
            )}
          </div>
        )}

        {/* =================================================================== */}
        {/* STORE VIEW */}
        {/* =================================================================== */}
        {role === "store" && (
          <div className="space-y-8">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-xs font-bold text-emerald-700 uppercase tracking-widest">
                  SELLER PORTAL
                </span>
                <h1 className="text-3xl font-black">Store workspace</h1>
              </div>
              <span className="rounded-full bg-emerald-100 px-4 py-1.5 text-xs font-bold text-emerald-800">
                ● Store online
              </span>
            </div>

            <div className="rounded-3xl bg-white p-6 md:p-8 shadow-sm border border-slate-200 space-y-6">
              <h2 className="text-2xl font-black">
                Incoming Orders (Store Accept Order & Food is Ready)
              </h2>
              <div className="space-y-4">
                {orders.map((ord) => (
                  <div
                    key={ord.id}
                    className="rounded-2xl border p-5 bg-slate-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
                  >
                    <div>
                      <h4 className="font-bold text-lg">
                        {ord.id} -{" "}
                        <button
                          onClick={() => {
                            playBeep("click");
                            setRole("customer");
                            setSelectedStore(ord.storeName);
                          }}
                          className="text-emerald-700 hover:underline"
                        >
                          {ord.storeName}
                        </button>
                      </h4>
                      <p className="text-xs text-slate-500">
                        {ord.items.join(", ")} · Status:{" "}
                        <b className="text-emerald-700">{ord.status}</b>
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => updateOrderStatus(ord.id, "Store Accept Order")}
                        className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700"
                      >
                        Store Accept Order ✓
                      </button>
                      <button
                        onClick={() => updateOrderStatus(ord.id, "Food is Ready")}
                        className="rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white hover:bg-amber-700"
                      >
                        Food is Ready 🍳
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Menu Management */}
            <div className="rounded-3xl bg-white p-6 md:p-8 shadow-sm border border-slate-200 space-y-6">
              <h2 className="text-2xl font-black">Menu Management</h2>
              <div className="grid gap-3 md:grid-cols-4">
                <input
                  value={newProductName}
                  onChange={(e) => setNewProductName(e.target.value)}
                  placeholder="Product name"
                  className="rounded-xl border px-3 py-2.5 text-sm outline-none focus:border-emerald-600"
                />
                <input
                  type="number"
                  value={newProductPrice}
                  onChange={(e) => setNewProductPrice(e.target.value)}
                  placeholder="Price (₱)"
                  className="rounded-xl border px-3 py-2.5 text-sm outline-none focus:border-emerald-600"
                />
                <select
                  value={newProductStore}
                  onChange={(e) => setNewProductStore(e.target.value)}
                  className="rounded-xl border px-3 py-2.5 text-sm outline-none focus:border-emerald-600"
                >
                  {STORES.map((s) => (
                    <option key={s.name} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => {
                    if (!newProductName.trim() || !newProductPrice) return;
                    const created: Product = {
                      id: `p-${Date.now()}`,
                      name: newProductName.trim(),
                      price: Number(newProductPrice),
                      store: newProductStore,
                      category: "food",
                      available: true,
                      image:
                        "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80",
                    };
                    setProducts((prev) => [created, ...prev]);
                    setNewProductName("");
                    setNewProductPrice("");
                    showToast(`Added ${created.name} to ${created.store}`, "approve");
                  }}
                  className="rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 flex items-center justify-center gap-1"
                >
                  <Plus size={16} /> Add Product
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b text-slate-400">
                      <th className="pb-2">Product</th>
                      <th className="pb-2">Store</th>
                      <th className="pb-2">Price</th>
                      <th className="pb-2">Available</th>
                      <th className="pb-2">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {products.map((p) => (
                      <tr key={p.id}>
                        <td className="py-3 font-bold">{p.name}</td>
                        <td className="text-slate-600">{p.store}</td>
                        <td className="font-bold text-emerald-700">₱{p.price}</td>
                        <td>
                          <input
                            type="checkbox"
                            checked={p.available}
                            onChange={() => {
                              playBeep("click");
                              setProducts((prev) =>
                                prev.map((item) =>
                                  item.id === p.id ? { ...item, available: !item.available } : item
                                )
                              );
                            }}
                            className="accent-emerald-600 h-4 w-4"
                          />
                        </td>
                        <td>
                          <button
                            onClick={() => {
                              setProducts((prev) => prev.filter((item) => item.id !== p.id));
                              showToast(`Deleted ${p.name}`, "delete");
                            }}
                            className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg"
                            aria-label="Delete product"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* ADMIN VIEW */}
        {/* =================================================================== */}
        {role === "admin" && (
          <div className="space-y-8">
            <div className="rounded-3xl bg-slate-900 p-8 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-xl">
              <div>
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">
                  ADMIN CONTROL CENTER
                </span>
                <h1 className="text-3xl font-black">Choy Admin</h1>
                <p className="text-slate-400 text-sm">
                  Firestore DB: {firestoreDatabaseId} · Render Status: {renderStatus}
                </p>
              </div>
              <button
                onClick={() => {
                  playBeep("click");
                  setTerminalOpen(true);
                }}
                className="rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white"
              >
                Open Terminal Diagnostics
              </button>
            </div>

            <div className="grid md:grid-cols-4 gap-6">
              <div className="rounded-3xl bg-white p-5 shadow-sm border border-slate-200 space-y-1">
                <h3 className="font-bold text-xs uppercase text-slate-400 tracking-wider mb-3">
                  Admin Menu
                </h3>
                {[
                  { id: "overview", label: "Overview & Orders" },
                  { id: "stores", label: "Store Accounts" },
                  { id: "riders", label: "Riders & 3km Zone" },
                  { id: "settings", label: "Render & Firebase Config" },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      playBeep("click");
                      setAdminSection(item.id);
                    }}
                    className={`w-full rounded-xl px-4 py-2.5 text-left text-sm font-bold transition-all ${
                      adminSection === item.id
                        ? "bg-emerald-600 text-white"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="md:col-span-3 space-y-6">
                {adminSection === "overview" && (
                  <div className="rounded-3xl bg-white p-6 md:p-8 shadow-sm border border-slate-200 space-y-6">
                    <h2 className="text-2xl font-black">Customer Order Approvals</h2>
                    <div className="space-y-4">
                      {orders.map((ord) => (
                        <div
                          key={ord.id}
                          className="rounded-2xl border p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
                        >
                          <div>
                            <h4 className="font-bold">
                              {ord.id} · {ord.customerName} ({ord.storeName})
                            </h4>
                            <p className="text-xs text-slate-500">
                              {ord.items.join(", ")} · ₱{ord.total} ·{" "}
                              <b className="text-emerald-700">{ord.status}</b>
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => updateOrderStatus(ord.id, "Admin Approve Order")}
                              className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow hover:bg-emerald-700"
                            >
                              Admin Approve Order ✓
                            </button>
                            <button
                              onClick={() => handleDeleteOrder(ord.id)}
                              className="rounded-xl bg-red-50 p-2 text-red-600 hover:bg-red-100"
                              aria-label="Delete order"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {adminSection === "stores" && (
                  <div className="rounded-3xl bg-white p-6 md:p-8 shadow-sm border border-slate-200 space-y-4">
                    <h2 className="text-2xl font-black">Registered Stores (Clickable)</h2>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {STORES.map((s) => (
                        <div key={s.name} className="rounded-2xl border p-4 flex justify-between items-center">
                          <div>
                            <button
                              onClick={() => {
                                playBeep("click");
                                setRole("customer");
                                setSelectedStore(s.name);
                              }}
                              className="font-bold text-emerald-800 hover:underline"
                            >
                              {s.name} ↗
                            </button>
                            <p className="text-xs text-slate-500">{s.category}</p>
                          </div>
                          <span className="text-xs font-bold text-emerald-700">Verified ✓</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {adminSection === "riders" && (
                  <div className="rounded-3xl bg-white p-6 md:p-8 shadow-sm border border-slate-200 space-y-4">
                    <h2 className="text-2xl font-black">Riders & 3km Delivery Tiers</h2>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between p-3 rounded-xl bg-slate-50">
                        <span>0–2 km</span>
                        <b>Customer ₱25 · Rider ₱20</b>
                      </div>
                      <div className="flex justify-between p-3 rounded-xl bg-slate-50">
                        <span>Over 2–5 km (3km Default Zone)</span>
                        <b>Customer ₱35 · Rider ₱30</b>
                      </div>
                      <div className="flex justify-between p-3 rounded-xl bg-slate-50">
                        <span>Over 5–10 km</span>
                        <b>Customer ₱50 · Rider ₱45</b>
                      </div>
                    </div>
                  </div>
                )}

                {adminSection === "settings" && (
                  <div className="rounded-3xl bg-white p-6 md:p-8 shadow-sm border border-slate-200 space-y-4">
                    <h2 className="text-2xl font-black">Render.com & Firebase Deployment Status</h2>
                    <div className="space-y-2 text-sm font-mono bg-slate-950 text-emerald-400 p-5 rounded-2xl">
                      <div>FIREBASE_PROJECT_ID = {firebaseProjectId}</div>
                      <div>FIRESTORE_DATABASE_ID = {firestoreDatabaseId}</div>
                      <div>DELIVERY_RADIUS_KM = 3</div>
                      <div>RENDER_HEALTH = {renderStatus}</div>
                      <div>BUILD_CMD = npm install && npm run build</div>
                      <div>START_CMD = npm start</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Floating Ask Choy Button & Chat Widget */}
      <button
        onClick={() => {
          playBeep("click");
          setChatOpen(!chatOpen);
        }}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-emerald-700 px-6 py-4 text-white font-bold shadow-2xl hover:bg-emerald-800 transition-all"
      >
        <span>🛵</span>
        <b>Ask Choy</b>
      </button>

      {chatOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-80 md:w-96 rounded-3xl bg-white shadow-2xl border border-slate-200 flex flex-col h-[450px]">
          <header className="flex justify-between items-center bg-emerald-900 text-white p-4 rounded-t-3xl font-bold">
            <div className="flex items-center gap-2">
              <span>🛵</span>
              <span>Ask Choy AI</span>
            </div>
            <button onClick={() => setChatOpen(false)} className="text-white hover:opacity-75">
              <X size={18} />
            </button>
          </header>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {chatMessages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl p-3 text-sm ${
                    msg.sender === "user"
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-100 text-slate-800"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="text-xs text-slate-400 animate-pulse">Choy AI is typing...</div>
            )}
          </div>
          <form onSubmit={handleSendChat} className="p-3 border-t flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Write a message..."
              className="flex-1 rounded-xl border px-3 py-2 text-sm outline-none focus:border-emerald-600"
            />
            <button
              type="submit"
              disabled={chatLoading}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white"
            >
              Send
            </button>
          </form>
        </div>
      )}

      {/* Checkout Modal */}
      {checkoutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-3 border-b">
              <h2 className="text-2xl font-black">
                Checkout ({cart.reduce((s, i) => s + i.quantity, 0)} items)
              </h2>
              <button
                onClick={() => setCheckoutOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X size={20} />
              </button>
            </div>

            {cart.length === 0 ? (
              <p className="text-sm text-slate-500 py-6 text-center">Your cart is empty.</p>
            ) : (
              <>
                <div className="space-y-3 max-h-48 overflow-y-auto">
                  {cart.map((item) => (
                    <div
                      key={item.product.id}
                      className="flex justify-between items-center text-sm border-b pb-2"
                    >
                      <span>
                        {item.product.name} × {item.quantity}
                      </span>
                      <div className="flex items-center gap-3">
                        <strong className="text-emerald-800">
                          ₱{item.product.price * item.quantity}
                        </strong>
                        <button
                          onClick={() => handleRemoveFromCart(item.product.id)}
                          className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg"
                          aria-label="Delete item"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-3">
                  <label className="block text-xs font-bold text-slate-600">
                    Delivery Address
                    <input
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none"
                    />
                  </label>
                  <label className="block text-xs font-bold text-slate-600">
                    Delivery Distance
                    <select
                      value={deliveryFee}
                      onChange={(e) => setDeliveryFee(Number(e.target.value))}
                      className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none"
                    >
                      <option value={25}>0–2 km · ₱25 delivery</option>
                      <option value={35}>Over 2–5 km (3km Zone) · ₱35 delivery</option>
                      <option value={50}>Over 5–10 km · ₱50 delivery</option>
                    </select>
                  </label>
                  <div>
                    <span className="block text-xs font-bold text-slate-600 mb-1">
                      Tip for Rider
                    </span>
                    <div className="flex gap-2">
                      {[0, 10, 20, 50].map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => {
                            playBeep("click");
                            setRiderTip(t);
                          }}
                          className={`rounded-xl px-3 py-1.5 text-xs font-bold border ${
                            riderTip === t
                              ? "bg-emerald-600 text-white border-emerald-600"
                              : "bg-slate-50 text-slate-700"
                          }`}
                        >
                          {t === 0 ? "No tip" : `₱${t}`}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4 flex justify-between items-center text-lg font-black">
                  <span>Total Amount</span>
                  <span className="text-emerald-700">
                    ₱
                    {cart.reduce((s, i) => s + i.product.price * i.quantity, 0) +
                      deliveryFee +
                      riderTip}
                  </span>
                </div>

                <button
                  onClick={async () => {
                    const orderId = `CJ-${Math.floor(1000 + Math.random() * 9000)}`;
                    const totalAmount =
                      cart.reduce((s, i) => s + i.product.price * i.quantity, 0) +
                      deliveryFee +
                      riderTip;
                    const newOrd: OrderItem = {
                      id: orderId,
                      customerName: firebaseUser?.displayName || "Juan Customer",
                      storeName: cart[0]?.product.store || selectedStore || "Jollibee",
                      items: cart.map((c) => `${c.product.name} x${c.quantity}`),
                      total: totalAmount,
                      status: "Customer Pick Order",
                      createdAt: new Date().toISOString(),
                    };

                    if (auth.currentUser) {
                      try {
                        const ref = await addDoc(collection(db, "orders"), newOrd);
                        newOrd.firestoreDocId = ref.id;
                        addNotification(`Order ${orderId} synced to Firestore!`);
                      } catch (err) {
                        try {
                          handleFirestoreError(err, OperationType.CREATE, "orders");
                        } catch {
                          // Fallback to local state
                        }
                      }
                    }

                    setOrders((prev) => [newOrd, ...prev]);
                    setCart([]);
                    setCheckoutOpen(false);
                    showToast(`Customer Pick Order (${orderId}) placed!`, "approve");
                  }}
                  className="w-full rounded-2xl bg-emerald-600 py-4 font-black text-white shadow-xl hover:bg-emerald-700 transition-all"
                >
                  Customer Pick Order & Place ✓
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Side Panels (Vouchers, Games, Map, Notifications) */}
      {activeSidePanel && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white p-6 shadow-2xl h-full overflow-y-auto space-y-6 flex flex-col">
            <div className="flex justify-between items-center pb-4 border-b">
              <h2 className="text-2xl font-black capitalize">{activeSidePanel}</h2>
              <button
                onClick={() => setActiveSidePanel(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X size={20} />
              </button>
            </div>

            {activeSidePanel === "notifications" && (
              <div className="space-y-3">
                {notifications.length === 0 ? (
                  <p className="text-sm text-slate-500">No notifications.</p>
                ) : (
                  notifications.map((n, i) => (
                    <div
                      key={i}
                      className="rounded-2xl border p-4 bg-emerald-50/50 text-sm flex justify-between items-start gap-3"
                    >
                      <span>{n}</span>
                      <button
                        onClick={() => {
                          setNotifications((prev) => prev.filter((_, idx) => idx !== i));
                          playBeep("delete");
                        }}
                        className="text-red-500 hover:bg-red-50 p-1 rounded-lg shrink-0"
                        aria-label="Delete notification"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeSidePanel === "vouchers" && (
              <div className="space-y-4">
                <div className="rounded-2xl border p-4 bg-emerald-50 border-emerald-200 flex justify-between items-center">
                  <div>
                    <h4 className="font-bold">10% OFF VOUCHER</h4>
                    <p className="text-xs text-slate-600 mt-1">Minimum spend ₱499</p>
                  </div>
                  <button
                    onClick={() => showToast("Voucher 10% OFF applied!", "approve")}
                    className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white"
                  >
                    Use
                  </button>
                </div>
                <div className="rounded-2xl border p-4 bg-emerald-50 border-emerald-200 flex justify-between items-center">
                  <div>
                    <h4 className="font-bold">FREE 3KM DELIVERY</h4>
                    <p className="text-xs text-slate-600 mt-1">Valid for orders today</p>
                  </div>
                  <button
                    onClick={() => {
                      setDeliveryFee(0);
                      showToast("Free 3km delivery voucher applied!", "approve");
                    }}
                    className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white"
                  >
                    Use
                  </button>
                </div>
              </div>
            )}

            {activeSidePanel === "games" && (
              <div className="text-center space-y-6 py-8">
                <div className="mx-auto h-32 w-32 rounded-full bg-emerald-600 text-white flex items-center justify-center font-black text-2xl shadow-xl">
                  CHOY
                </div>
                <p className="text-sm text-slate-500">{spinTickets} tickets available</p>
                <button
                  disabled={spinTickets <= 0}
                  onClick={() => {
                    if (spinTickets <= 0) return;
                    setSpinTickets((t) => t - 1);
                    setRewardPoints((p) => p + 100);
                    showToast("Congratulations! Won +100 reward points!", "approve");
                  }}
                  className="rounded-2xl bg-emerald-600 px-6 py-3 font-bold text-white shadow-md hover:bg-emerald-700 disabled:opacity-50"
                >
                  Spin Now (+100 pts)
                </button>
              </div>
            )}

            {activeSidePanel === "map" && activeOrder && (
              <div className="space-y-6">
                <LiveTracingMap
                  storeName={activeOrder.storeName}
                  address={deliveryAddress}
                  status={activeOrder.status}
                  onTone={() => playBeep("click")}
                />
                <div className="space-y-2">
                  <h4 className="font-bold text-sm">Quick Order Flow Controls</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {ORDER_STEPS.map((step) => (
                      <button
                        key={step}
                        onClick={() => updateOrderStatus(activeOrder.id, step)}
                        className={`rounded-xl py-2 px-2 text-[11px] font-bold ${
                          activeOrder.status === step
                            ? "bg-emerald-600 text-white"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }`}
                      >
                        {step}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Terminal Modal */}
      {terminalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-3xl bg-slate-950 p-6 text-emerald-400 font-mono shadow-2xl border border-slate-800 flex flex-col h-[480px]">
            <div className="flex justify-between items-center pb-4 border-b border-slate-800 text-slate-200">
              <div className="flex items-center gap-2">
                <Terminal size={20} className="text-emerald-500" />
                <span className="font-bold text-sm">
                  ChoyJiez Terminal CLI (Firebase + Render)
                </span>
              </div>
              <button
                onClick={() => setTerminalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto py-4 space-y-2 text-xs md:text-sm whitespace-pre-wrap">
              {terminalLogs.map((log, idx) => (
                <div
                  key={idx}
                  className={log.startsWith(">") ? "text-amber-300 font-bold" : "text-emerald-400"}
                >
                  {log}
                </div>
              ))}
              <div ref={terminalEndRef} />
            </div>
            <form onSubmit={handleTerminalSubmit} className="pt-4 border-t border-slate-800 flex gap-2">
              <span className="text-emerald-500 font-bold">$</span>
              <input
                type="text"
                value={terminalInput}
                onChange={(e) => setTerminalInput(e.target.value)}
                placeholder="Type command (help, health, config, status, orders)..."
                className="flex-1 bg-transparent text-emerald-300 outline-none font-mono text-sm"
                autoFocus
              />
              <button
                type="submit"
                className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white"
              >
                Run
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-2xl bg-slate-900 px-6 py-3 text-sm font-bold text-white shadow-2xl flex items-center gap-2">
          <Volume2 size={16} className="text-emerald-400" /> {toastMessage}
        </div>
      )}
    </div>
  );
}

/**
 * Interactive Leaflet-style 3km Tracing Line Map
 */
function LiveTracingMap({
  storeName,
  address,
  status,
  onTone,
}: {
  storeName: string;
  address: string;
  status: OrderStatus;
  onTone: () => void;
}) {
  const [zoom, setZoom] = useState(1);

  const stepIndex = ORDER_STEPS.indexOf(status);
  // Rider position along 3km route: 0% before Rider Pick Up, 55% on the way, 100% delivered
  const progress =
    stepIndex <= 4 ? 0.08 : stepIndex === 5 ? 0.35 : stepIndex === 6 ? 0.72 : 1.0;

  const riderX = 60 + (340 - 60) * progress;
  const riderY = 155 - Math.sin(progress * Math.PI) * 55;
  const remainingKm = (3.0 * (1 - progress)).toFixed(1);

  return (
    <div className="rounded-3xl bg-slate-900 p-5 text-white space-y-4 border border-slate-800">
      <div className="flex flex-wrap justify-between items-center gap-2">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">
            Leaflet 3km Route Tracer
          </span>
          <h3 className="font-black text-base">
            {storeName} → {address}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-emerald-600/30 border border-emerald-500/40 px-3 py-1 text-xs font-bold text-emerald-300">
            {remainingKm} km / 3.0 km
          </span>
          <button
            onClick={() => {
              onTone();
              setZoom((z) => Math.min(1.3, Number((z + 0.1).toFixed(1))));
            }}
            className="rounded-lg bg-slate-800 p-1.5 hover:bg-slate-700"
            aria-label="Zoom in"
          >
            <ZoomIn size={15} />
          </button>
          <button
            onClick={() => {
              onTone();
              setZoom((z) => Math.max(0.8, Number((z - 0.1).toFixed(1))));
            }}
            className="rounded-lg bg-slate-800 p-1.5 hover:bg-slate-700"
            aria-label="Zoom out"
          >
            <ZoomOut size={15} />
          </button>
        </div>
      </div>

      {/* Interactive SVG Map Viewport */}
      <div className="relative h-56 w-full overflow-hidden rounded-2xl bg-[#0f1f18] border border-emerald-900/60">
        <svg
          viewBox="0 0 400 200"
          className="h-full w-full transition-transform duration-200"
          style={{ transform: `scale(${zoom})` }}
        >
          {/* Street Grid Background */}
          <defs>
            <pattern id="grid" width="25" height="25" patternUnits="userSpaceOnUse">
              <path d="M 25 0 L 0 0 0 25" fill="none" stroke="#1b3a2c" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="400" height="200" fill="url(#grid)" />

          {/* Secondary Roads */}
          <path d="M 0 120 Q 150 90 400 135" fill="none" stroke="#1e4533" strokeWidth="6" />
          <path d="M 180 0 L 210 200" fill="none" stroke="#1e4533" strokeWidth="5" />

          {/* 3km Radius Circle */}
          <circle
            cx="200"
            cy="115"
            r="155"
            fill="rgba(16, 185, 129, 0.05)"
            stroke="#10b981"
            strokeOpacity="0.3"
            strokeDasharray="4 4"
          />

          {/* 3km Tracing Line */}
          <path
            d="M 60 155 Q 200 45 340 155"
            fill="none"
            stroke="#10b981"
            strokeWidth="4"
            strokeDasharray="7 5"
          />

          {/* Store Pin (0.0 km) */}
          <g transform="translate(60, 155)">
            <circle r="11" fill="#059669" stroke="#ffffff" strokeWidth="2" />
            <text y="4" textAnchor="middle" fontSize="11">
              🏪
            </text>
            <text y="24" textAnchor="middle" fill="#a7f3d0" fontSize="9" fontWeight="bold">
              Store (0km)
            </text>
          </g>

          {/* Customer Pin (3.0 km) */}
          <g transform="translate(340, 155)">
            <circle r="11" fill="#d97706" stroke="#ffffff" strokeWidth="2" />
            <text y="4" textAnchor="middle" fontSize="11">
              📍
            </text>
            <text y="24" textAnchor="middle" fill="#fde68a" fontSize="9" fontWeight="bold">
              You (3km)
            </text>
          </g>

          {/* Animated Rider Marker */}
          <g transform={`translate(${riderX}, ${riderY})`}>
            <circle r="14" fill="#10b981" fillOpacity="0.3" />
            <circle r="10" fill="#10b981" stroke="#ffffff" strokeWidth="2" />
            <text y="4" textAnchor="middle" fontSize="11">
              🛵
            </text>
          </g>
        </svg>

        <div className="absolute bottom-2 left-3 rounded-lg bg-slate-950/80 px-2.5 py-1 text-[10px] text-slate-300">
          3km Tracing Line · Status: <b className="text-emerald-400">{status}</b>
        </div>
      </div>
    </div>
  );
}
