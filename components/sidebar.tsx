"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useLanguage } from "./language-context";
import { TrialStatusCard } from "./trial-status-card";
import { createClient } from "@/lib/supabase/client";

type SidebarProps = {
  mobileOpen?: boolean;
  onClose?: () => void;
};

function Icon({
  type,
  className = "h-5 w-5",
}: {
  type: string;
  className?: string;
}) {
  const props = {
    className,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    viewBox: "0 0 24 24",
  };

  switch (type) {
    case "dashboard":
      return (
        <svg {...props}>
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      );

    case "customers":
      return (
        <svg {...props}>
          <circle cx="9" cy="8" r="3" />
          <circle cx="17" cy="9" r="2.5" />
          <path d="M3.5 19c.7-3 2.5-4.5 5.5-4.5S13.8 16 14.5 19" />
          <path d="M14 15.5c2.8-.2 5.2.9 6 3.5" />
        </svg>
      );

    case "orders":
      return (
        <svg {...props}>
          <path d="M6 3h12l2 4v14H4V7l2-4Z" />
          <path d="M4 7h16" />
          <path d="M9 11h6M9 15h6" />
        </svg>
      );

    case "segments":
      return (
        <svg {...props}>
          <path d="M4 5h16M7 12h10M10 19h4" />
        </svg>
      );

    case "retention":
      return (
        <svg {...props}>
          <path d="M20 11a8 8 0 1 1-2.3-5.7" />
          <path d="M20 4v6h-6" />
        </svg>
      );

    case "campaigns":
      return (
        <svg {...props}>
          <path d="M4 14V9l11-4v13L4 14Z" />
          <path d="M15 9h4l2 3-2 3h-4" />
          <path d="M7 14l1.5 5" />
        </svg>
      );

    case "automation":
      return (
        <svg {...props}>
          <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
          <circle cx="12" cy="12" r="5" />
          <path d="M8.5 8.5l-2-2M15.5 15.5l2 2M15.5 8.5l2-2M8.5 15.5l-2 2" />
        </svg>
      );

    case "whatsapp":
      return (
        <svg {...props}>
          <path d="M20 11.5a8 8 0 0 1-11.8 7L4 20l1.5-4A8 8 0 1 1 20 11.5Z" />
          <path d="M9 8.5c.3-.4.7-.4 1-.1l1 1c.3.3.3.7 0 1l-.5.5c.8 1.4 1.8 2.3 3.2 3l.5-.5c.3-.3.7-.3 1 0l1 1c.3.3.3.8-.1 1.1-.5.5-1.1.7-1.8.5-2.1-.5-5.2-3.6-5.7-5.7-.2-.7 0-1.3.4-1.8Z" />
        </svg>
      );

    case "settings":
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.8 1.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-2.6V20a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1-1.8-1.8.1-.1A1.7 1.7 0 0 0 8 15a1.7 1.7 0 0 0-1.6-1H6v-2.6h.4A1.7 1.7 0 0 0 8 10a1.7 1.7 0 0 0-.3-1.9l-.1-.1 1.8-1.8.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6V4h2.6v.4a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1 1.8 1.8-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2V14h-.2a1.7 1.7 0 0 0-1.6 1Z" />
        </svg>
      );

    case "billing":
      return (
        <svg {...props}>
          <rect x="4" y="5" width="16" height="14" rx="2" />
          <path d="M8 9h8M8 13h5M8 16h3" />
        </svg>
      );

    case "logout":
      return (
        <svg {...props}>
          <path d="M10 5H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h4" />
          <path d="M14 8l4 4-4 4" />
          <path d="M18 12H9" />
        </svg>
      );

    default:
      return null;
  }
}

const navItems = [
  { href: "/dashboard", key: "dashboard", icon: "dashboard" },
  { href: "/customers", key: "customersTitle", icon: "customers" },
  { href: "/orders", key: "ordersTitle", icon: "orders" },
  { href: "/segments", key: "segmentsTitle", icon: "segments" },
  { href: "/retention", key: "retentionTitle", icon: "retention" },
  { href: "/campaigns", key: "campaignsTitle", icon: "campaigns" },
  { href: "/automation", key: "automationTitle", icon: "automation" },
  { href: "/whatsapp", key: "whatsappTitle", icon: "whatsapp" },
  { href: "/settings", key: "settingsTitle", icon: "settings" },
  { href: "/billing", key: "billingTitle", icon: "billing" },
];

export function Sidebar({
  mobileOpen = false,
  onClose,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { language, t } = useLanguage();

  const isArabic = language === "ar";

  async function handleLogout() {
    const supabase = createClient();

    await supabase.auth.signOut();

    onClose?.();

    router.replace("/login");
    router.refresh();
  }

  return (
    <aside
      dir={isArabic ? "rtl" : "ltr"}
      className={`
        fixed inset-y-0 left-0 z-50 flex h-[100dvh] w-[280px]
        flex-col border-r border-slate-200 bg-white px-4 py-6
        shadow-2xl transition-transform duration-300
        dark:border-slate-800 dark:bg-slate-900
        ${
          mobileOpen
            ? "translate-x-0"
            : "-translate-x-full"
        }
        md:sticky md:top-0 md:z-auto md:h-screen md:w-64
        md:translate-x-0 md:shadow-none
      `}
    >
      <div
        className={`flex shrink-0 items-center justify-between px-3 ${
          isArabic ? "text-right" : "text-left"
        }`}
      >
        <div className="text-xl font-bold text-slate-900 dark:text-white">
          Restaurant{" "}
          <span className="text-blue-600 dark:text-blue-400">
            Growth OS
          </span>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800 md:hidden"
          aria-label="Close menu"
        >
          ✕
        </button>
      </div>

      <nav className="mt-8 min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
        {navItems.map((item) => {
          const active =
            pathname === item.href ||
            pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
                active
                  ? "bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300"
                  : "text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              <span className="shrink-0">
                <Icon type={item.icon} />
              </span>

              <span>{t(item.key)}</span>
            </Link>
          );
        })}

        <Link
          href="/account"
          onClick={onClose}
          className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <span className="shrink-0">👤</span>

          <span>{isArabic ? "الحساب" : "Account"}</span>
        </Link>
      </nav>

      <div className="shrink-0 pt-4">
        <TrialStatusCard />

        <button
          type="button"
          onClick={handleLogout}
          className="mt-3 flex w-full items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <span className="shrink-0">
            <Icon type="logout" />
          </span>

          <span>
            {isArabic ? "تسجيل الخروج" : "Log out"}
          </span>
        </button>
      </div>
    </aside>
  );
}