"use client";

import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useLanguage } from "@/components/language-context";
import { useTheme, type Theme } from "@/components/theme-context";

const sections = [
  {
    id: "restaurant",
    en: "Restaurant",
    ar: "\u0627\u0644\u0645\u0637\u0639\u0645",
  },
  {
    id: "business",
    en: "Business",
    ar: "\u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u062a\u062c\u0627\u0631\u064a\u0629",
  },
  {
    id: "appearance",
    en: "Appearance",
    ar: "\u0627\u0644\u0645\u0638\u0647\u0631",
  },
  {
    id: "crm",
    en: "Customers & CRM",
    ar: "\u0627\u0644\u0639\u0645\u0644\u0627\u0621 \u0648 CRM",
  },
  {
    id: "orders",
    en: "Orders",
    ar: "\u0627\u0644\u0637\u0644\u0628\u0627\u062a",
  },
  {
    id: "whatsapp",
    en: "WhatsApp",
    ar: "\u0648\u0627\u062a\u0633\u0627\u0628",
  },
  {
    id: "campaigns",
    en: "Campaigns",
    ar: "\u0627\u0644\u062d\u0645\u0644\u0627\u062a",
  },
  {
    id: "team",
    en: "Team & Access",
    ar: "\u0627\u0644\u0641\u0631\u064a\u0642 \u0648\u0627\u0644\u0635\u0644\u0627\u062d\u064a\u0627\u062a",
  },
  {
    id: "notifications",
    en: "Notifications",
    ar: "\u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062a",
  },
  {
    id: "security",
    en: "Security",
    ar: "\u0627\u0644\u0623\u0645\u0627\u0646",
  },
  {
    id: "billing",
    en: "Billing",
    ar: "\u0627\u0644\u0627\u0634\u062a\u0631\u0627\u0643",
  },
];

function SectionIcon({
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
    case "restaurant":
      return (
        <svg {...props}>
          <path d="M4 21V5h16v16" />
          <path d="M8 9h2M14 9h2M8 13h2M14 13h2M8 17h8" />
        </svg>
      );

    case "business":
      return (
        <svg {...props}>
          <rect x="4" y="4" width="16" height="16" rx="2" />
          <path d="M8 8h8M8 12h8M8 16h5" />
        </svg>
      );

    case "appearance":
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42" />
        </svg>
      );

    case "crm":
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
          <path d="M4 7h16M9 11h6M9 15h6" />
        </svg>
      );

    case "whatsapp":
      return (
        <svg {...props}>
          <path d="M20 11.5a8 8 0 0 1-11.8 7L4 20l1.5-4A8 8 0 1 1 20 11.5Z" />
          <path d="M9 8.5c.3-.4.7-.4 1-.1l1 1c.3.3.3.7 0 1l-.5.5c.8 1.4 1.8 2.3 3.2 3l.5-.5c.3-.3.7-.3 1 0l1 1c.3.3.3.8-.1 1.1-.5.5-1.1.7-1.8.5-2.1-.5-5.2-3.6-5.7-5.7-.2-.7 0-1.3.4-1.8Z" />
        </svg>
      );

    case "campaigns":
      return (
        <svg {...props}>
          <path d="M4 14V9l11-4v13L4 14Z" />
          <path d="M15 9h4l2 3-2 3h-4M7 14l1.5 5" />
        </svg>
      );

    case "team":
      return (
        <svg {...props}>
          <circle cx="9" cy="8" r="3" />
          <circle cx="17" cy="9" r="2.5" />
          <path d="M3.5 19c.7-3 2.5-4.5 5.5-4.5S13.8 16 14.5 19" />
          <path d="M14 15.5c2.8-.2 5.2.9 6 3.5" />
        </svg>
      );

    case "notifications":
      return (
        <svg {...props}>
          <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z" />
          <path d="M10 21h4" />
        </svg>
      );

    case "security":
      return (
        <svg {...props}>
          <path d="M12 3 5 6v5c0 4.5 2.7 8.1 7 10 4.3-1.9 7-5.5 7-10V6l-7-3Z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      );

    case "billing":
      return (
        <svg {...props}>
          <rect x="4" y="5" width="16" height="14" rx="2" />
          <path d="M8 9h8M8 13h5M8 16h3" />
        </svg>
      );

    case "check":
      return (
        <svg {...props}>
          <path d="m5 12 4 4L19 6" />
        </svg>
      );

    default:
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="8" />
        </svg>
      );
  }
}

export default function SettingsPage() {
  const { language, setLanguage } = useLanguage();
  const { theme, setTheme } = useTheme();

  const isArabic = language === "ar";

  const [activeSection, setActiveSection] =
    useState("restaurant");

  const active =
    sections.find(
      (section) => section.id === activeSection
    ) || sections[0];

  const themeOptions: {
    value: Theme;
    en: string;
    ar: string;
    descriptionEn: string;
    descriptionAr: string;
    icon: "sun" | "moon" | "system";
  }[] = [
    {
      value: "light",
      en: "Light",
      ar: "\u0641\u0627\u062a\u062d",
      descriptionEn: "Use the light interface.",
      descriptionAr: "\u0627\u0633\u062a\u062e\u062f\u0645 \u0627\u0644\u0645\u0638\u0647\u0631 \u0627\u0644\u0641\u0627\u062a\u062d.",
      icon: "sun",
    },
    {
      value: "dark",
      en: "Dark",
      ar: "\u062f\u0627\u0643\u0646",
      descriptionEn: "Use the dark interface.",
      descriptionAr: "\u0627\u0633\u062a\u062e\u062f\u0645 \u0627\u0644\u0645\u0638\u0647\u0631 \u0627\u0644\u062f\u0627\u0643\u0646.",
      icon: "moon",
    },
    {
      value: "system",
      en: "System",
      ar: "\u062a\u0644\u0642\u0627\u0626\u064a",
      descriptionEn: "Follow your device settings.",
      descriptionAr: "\u0627\u062a\u0628\u0639 \u0625\u0639\u062f\u0627\u062f\u0627\u062a \u062c\u0647\u0627\u0632\u0643.",
      icon: "system",
    },
  ];

  function ThemeIcon({
    type,
  }: {
    type: "sun" | "moon" | "system";
  }) {
    if (type === "sun") {
      return (
        <svg
          className="h-7 w-7"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          viewBox="0 0 24 24"
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42" />
        </svg>
      );
    }

    if (type === "moon") {
      return (
        <svg
          className="h-7 w-7"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          viewBox="0 0 24 24"
        >
          <path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11Z" />
        </svg>
      );
    }

    return (
      <svg
        className="h-7 w-7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        viewBox="0 0 24 24"
      >
        <rect x="4" y="4" width="16" height="16" rx="2" />
        <path d="M9 4v16" />
      </svg>
    );
  }

  return (
    <AppShell
      title="Settings"
      titleKey="settingsTitle"
    >
      <div
        dir={isArabic ? "rtl" : "ltr"}
        className="grid gap-6 lg:grid-cols-[250px_minmax(0,1fr)]"
      >
        {/* Settings navigation */}
        <aside className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-3 px-3 py-2 text-xs font-bold tracking-wider text-slate-400">
            {isArabic
              ? "\u0627\u0644\u0625\u0639\u062f\u0627\u062f\u0627\u062a"
              : "SETTINGS"}
          </div>

          <div className="space-y-1">
            {sections.map((section) => {
              const selected =
                section.id === activeSection;

              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() =>
                    setActiveSection(section.id)
                  }
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
                    selected
                      ? "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"
                      : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                  }`}
                >
                  <SectionIcon
                    type={section.id}
                    className="h-4 w-4 shrink-0"
                  />

                  <span>
                    {isArabic
                      ? section.ar
                      : section.en}
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Main content */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-200 p-6 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300">
                <SectionIcon
                  type={active.id}
                />
              </div>

              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  {isArabic
                    ? active.ar
                    : active.en}
                </h2>

                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {isArabic
                    ? "\u0625\u062f\u0631 \u0625\u0639\u062f\u0627\u062f\u0627\u062a \u0645\u0637\u0639\u0645\u0643 \u0648\u0627\u0644\u0646\u0638\u0627\u0645 \u0628\u0634\u0643\u0644 \u0628\u0633\u064a\u0637."
                    : "Manage your restaurant and system settings in one place."}
                </p>
              </div>
            </div>
          </div>

          {/* Restaurant */}
          {activeSection === "restaurant" && (
            <div className="space-y-6 p-6">
              <div>
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {isArabic
                    ? "\u0627\u0633\u0645 \u0627\u0644\u0645\u0637\u0639\u0645"
                    : "Restaurant Name"}
                </label>

                <input
                  type="text"
                  placeholder={
                    isArabic
                      ? "\u0627\u0633\u0645 \u0645\u0637\u0639\u0645\u0643"
                      : "Your restaurant name"
                  }
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {isArabic
                    ? "\u0631\u0642\u0645 \u0627\u0644\u0647\u0627\u062a\u0641"
                    : "Phone"}
                </label>

                <input
                  type="text"
                  placeholder="+20..."
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {isArabic
                    ? "\u0627\u0644\u0639\u0646\u0648\u0627\u0646"
                    : "Address"}
                </label>

                <textarea
                  rows={4}
                  placeholder={
                    isArabic
                      ? "\u0639\u0646\u0648\u0627\u0646 \u0627\u0644\u0645\u0637\u0639\u0645"
                      : "Restaurant address"
                  }
                  className="mt-2 w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <button
                type="button"
                className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                {isArabic
                  ? "\u062d\u0641\u0638 \u0627\u0644\u062a\u0639\u062f\u064a\u0644\u0627\u062a"
                  : "Save Changes"}
              </button>
            </div>
          )}

          {/* Business */}
          {activeSection === "business" && (
            <div className="space-y-6 p-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {isArabic
                      ? "\u0627\u0644\u0639\u0645\u0644\u0629"
                      : "Currency"}
                  </label>

                  <select className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white">
                    <option>EGP</option>
                    <option>USD</option>
                    <option>SAR</option>
                    <option>AED</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {isArabic
                      ? "\u0627\u0644\u0645\u0646\u0637\u0642\u0629 \u0627\u0644\u0632\u0645\u0646\u064a\u0629"
                      : "Timezone"}
                  </label>

                  <select className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white">
                    <option>Africa/Cairo</option>
                    <option>Asia/Riyadh</option>
                    <option>Asia/Dubai</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Appearance */}
          {activeSection === "appearance" && (
            <div className="space-y-8 p-6">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {isArabic
                    ? "\u0627\u0644\u0645\u0638\u0647\u0631"
                    : "Theme"}
                </h3>

                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {isArabic
                    ? "\u0627\u062e\u062a\u0631 \u0634\u0643\u0644 \u0627\u0644\u0646\u0638\u0627\u0645 \u0627\u0644\u0645\u0646\u0627\u0633\u0628 \u0644\u0643."
                    : "Choose how the application should look."}
                </p>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {themeOptions.map(
                    (option) => {
                      const selected =
                        theme ===
                        option.value;

                      return (
                        <button
                          key={
                            option.value
                          }
                          type="button"
                          onClick={() =>
                            setTheme(
                              option.value
                            )
                          }
                          className={`rounded-2xl border p-5 text-start transition ${
                            selected
                              ? "border-blue-500 bg-blue-50 ring-2 ring-blue-100 dark:border-blue-500 dark:bg-blue-950/40 dark:ring-blue-900"
                              : "border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:hover:bg-slate-800"
                          }`}
                        >
                          <div className="text-slate-700 dark:text-slate-200">
                            <ThemeIcon
                              type={
                                option.icon
                              }
                            />
                          </div>

                          <div className="mt-3 font-semibold text-slate-900 dark:text-white">
                            {isArabic
                              ? option.ar
                              : option.en}
                          </div>

                          <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                            {isArabic
                              ? option.descriptionAr
                              : option.descriptionEn}
                          </p>

                          {selected && (
                            <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-300">
                              <SectionIcon
                                type="check"
                                className="h-3.5 w-3.5"
                              />

                              {isArabic
                                ? "\u0645\u062d\u062f\u062f \u062d\u0627\u0644\u064a\u064b\u0627"
                                : "Currently selected"}
                            </div>
                          )}
                        </button>
                      );
                    }
                  )}
                </div>
              </div>

              <div className="border-t border-slate-200 pt-6 dark:border-slate-800">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {isArabic
                    ? "\u0627\u0644\u0644\u063a\u0629"
                    : "Language"}
                </h3>

                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {isArabic
                    ? "\u0627\u062e\u062a\u0631 \u0627\u0644\u0644\u063a\u0629 \u0627\u0644\u062a\u064a \u062a\u0641\u0636\u0644 \u0627\u0633\u062a\u062e\u062f\u0627\u0645\u0647\u0627."
                    : "Choose your preferred language."}
                </p>

                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setLanguage("en")
                    }
                    className={`rounded-xl border px-5 py-3 text-sm font-semibold transition ${
                      language ===
                      "en"
                        ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                    }`}
                  >
                    English
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setLanguage("ar")
                    }
                    className={`rounded-xl border px-5 py-3 text-sm font-semibold transition ${
                      language ===
                      "ar"
                        ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                    }`}
                  >
                    {"\u0639\u0631\u0628\u064a"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Placeholder sections */}
          {activeSection !== "restaurant" &&
            activeSection !== "business" &&
            activeSection !== "appearance" && (
              <div className="p-10">
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center dark:border-slate-700 dark:bg-slate-950">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-slate-500 shadow-sm dark:bg-slate-900 dark:text-slate-300">
                    <SectionIcon
                      type={active.id}
                      className="h-7 w-7"
                    />
                  </div>

                  <h3 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">
                    {isArabic
                      ? active.ar
                      : active.en}
                  </h3>

                  <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500 dark:text-slate-400">
                    {isArabic
                      ? "\u0633\u064a\u062a\u0645 \u0625\u0636\u0627\u0641\u0629 \u0625\u0639\u062f\u0627\u062f\u0627\u062a \u0647\u0630\u0627 \u0627\u0644\u0642\u0633\u0645 \u0641\u064a \u0627\u0644\u0625\u0635\u062f\u0627\u0631\u0627\u062a \u0627\u0644\u0642\u0627\u062f\u0645\u0629."
                      : "This section is ready for its restaurant-specific configuration layer."}
                  </p>
                </div>
              </div>
            )}
        </section>
      </div>
    </AppShell>
  );
}
