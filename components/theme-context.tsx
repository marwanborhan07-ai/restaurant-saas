"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Theme = "light" | "dark" | "system";

type ThemeContextValue = {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: Theme) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function getSystemTheme(): "light" | "dark" {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyTheme(theme: Theme) {
  const resolved =
    theme === "system" ? getSystemTheme() : theme;

  document.documentElement.classList.toggle(
    "dark",
    resolved === "dark"
  );

  document.documentElement.style.colorScheme = resolved;
}

export function ThemeProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [theme, setThemeState] = useState<Theme>("system");
  const [resolvedTheme, setResolvedTheme] =
    useState<"light" | "dark">("light");

  useEffect(() => {
    const saved = window.localStorage.getItem(
      "restaurant-growth-theme"
    ) as Theme | null;

    const initial: Theme =
      saved === "light" ||
      saved === "dark" ||
      saved === "system"
        ? saved
        : "system";

    setThemeState(initial);

    const resolved =
      initial === "system"
        ? getSystemTheme()
        : initial;

    setResolvedTheme(resolved);
    applyTheme(initial);
  }, []);

  useEffect(() => {
    if (theme !== "system") return;

    const media = window.matchMedia(
      "(prefers-color-scheme: dark)"
    );

    const handleChange = () => {
      const resolved = getSystemTheme();
      setResolvedTheme(resolved);
      applyTheme("system");
    };

    media.addEventListener("change", handleChange);

    return () => {
      media.removeEventListener(
        "change",
        handleChange
      );
    };
  }, [theme]);

  function setTheme(nextTheme: Theme) {
    setThemeState(nextTheme);

    window.localStorage.setItem(
      "restaurant-growth-theme",
      nextTheme
    );

    const resolved =
      nextTheme === "system"
        ? getSystemTheme()
        : nextTheme;

    setResolvedTheme(resolved);
    applyTheme(nextTheme);
  }

  const value = useMemo(
    () => ({
      theme,
      resolvedTheme,
      setTheme,
    }),
    [theme, resolvedTheme]
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error(
      "useTheme must be used inside ThemeProvider"
    );
  }

  return context;
}
