"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Language = "en" | "ar";

type TranslationMap = {
  [key: string]: {
    en: string;
    ar: string;
  };
};

export const translations: TranslationMap = {
  dashboard: { en: "Dashboard", ar: "لوحة التحكم" },
  restaurantOverview: {
    en: "Restaurant Overview",
    ar: "نظرة عامة على المطعم",
  },
  trackPerformance: {
    en: "Track your restaurant performance and customer growth",
    ar: "تابع أداء مطعمك ونمو قاعدة عملائك",
  },

  vipCustomers: { en: "VIP Customers", ar: "عملاء VIP" },
  totalCustomers: { en: "Total Customers", ar: "إجمالي العملاء" },
  totalOrders: { en: "Total Orders", ar: "إجمالي الطلبات" },
  totalRevenue: { en: "Total Revenue", ar: "إجمالي الإيرادات" },

  topCustomers: { en: "Top Customers", ar: "أفضل العملاء" },
  highestSpending: {
    en: "Customers with the highest spending",
    ar: "العملاء الأكثر إنفاقًا",
  },

  recentOrders: { en: "Recent Orders", ar: "أحدث الطلبات" },
  latestOrders: {
    en: "Your latest restaurant orders",
    ar: "أحدث طلبات المطعم",
  },

  orders: { en: "orders", ar: "طلبات" },
  customer: { en: "Customer", ar: "العميل" },

  completed: { en: "completed", ar: "مكتمل" },
  pending: { en: "pending", ar: "قيد الانتظار" },
  processing: { en: "processing", ar: "قيد التنفيذ" },
  cancelled: { en: "cancelled", ar: "ملغي" },
  delivered: { en: "delivered", ar: "تم التوصيل" },
  confirmed: { en: "confirmed", ar: "مؤكد" },

  freeTrial: { en: "Free Trial", ar: "تجربة مجانية" },
  daysRemaining: { en: "days remaining", ar: "يوم متبقي" },

  dashboardTitle: { en: "Dashboard", ar: "لوحة التحكم" },
  customersTitle: { en: "Customers", ar: "العملاء" },
  ordersTitle: { en: "Orders", ar: "الطلبات" },
  segmentsTitle: { en: "Segments", ar: "الشرائح" },
  retentionTitle: {
    en: "Customer Retention",
    ar: "الاحتفاظ بالعملاء",
  },
  campaignsTitle: { en: "Campaigns", ar: "الحملات" },
  automationTitle: { en: "Automation", ar: "الأتمتة" },
  whatsappTitle: { en: "WhatsApp", ar: "واتساب" },
  settingsTitle: { en: "Settings", ar: "الإعدادات" },
  billingTitle: { en: "Billing", ar: "الاشتراكات" },

  loading: { en: "Loading...", ar: "جاري التحميل..." },
  noData: { en: "No data yet", ar: "لا توجد بيانات حتى الآن" },
};

type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  toggleLanguage: () => void;
  t: (key: string) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [language, setLanguageState] = useState<Language>("en");

  useEffect(() => {
    const saved = window.localStorage.getItem(
      "restaurant-growth-language"
    ) as Language | null;

    const initial: Language = saved === "ar" ? "ar" : "en";

    setLanguageState(initial);

    // Keep the document direction LTR.
    // Individual UI sections control their own RTL/LTR direction.
    document.documentElement.dir = "ltr";
    document.documentElement.lang = initial;
  }, []);

  function setLanguage(nextLanguage: Language) {
    setLanguageState(nextLanguage);

    window.localStorage.setItem(
      "restaurant-growth-language",
      nextLanguage
    );

    // Never change the global document direction.
    // This prevents RTL from forcing the whole page to horizontally scroll.
    document.documentElement.dir = "ltr";
    document.documentElement.lang = nextLanguage;

    window.dispatchEvent(
      new CustomEvent("restaurant-growth-language-change", {
        detail: nextLanguage,
      })
    );
  }

  function toggleLanguage() {
    setLanguage(language === "en" ? "ar" : "en");
  }

  function t(key: string) {
    return translations[key]?.[language] ?? key;
  }

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      toggleLanguage,
      t,
    }),
    [language]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error(
      "useLanguage must be used inside LanguageProvider"
    );
  }

  return context;
}
