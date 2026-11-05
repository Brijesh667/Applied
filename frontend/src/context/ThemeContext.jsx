import React, { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    try {
      const stored = localStorage.getItem("applied-theme");
      if (stored === "light" || stored === "dark") {
        return stored;
      }
    } catch {
      // ignore
    }
    if (typeof window !== "undefined" && window.matchMedia) {
      return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }
    return "light";
  });

  const [hasManualPreference, setHasManualPreference] = useState(() => {
    try {
      const stored = localStorage.getItem("applied-theme");
      return stored === "light" || stored === "dark";
    } catch {
      return false;
    }
  });

  const setTheme = (newTheme) => {
    if (newTheme !== "light" && newTheme !== "dark") return;
    setThemeState(newTheme);
    setHasManualPreference(true);
    try {
      localStorage.setItem("applied-theme", newTheme);
    } catch {
      // ignore
    }
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  // Keep data-theme on <html> in sync
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  // Follow OS changes only if user never chose manually
  useEffect(() => {
    if (hasManualPreference || typeof window === "undefined" || !window.matchMedia) {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e) => {
      setThemeState(e.matches ? "dark" : "light");
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [hasManualPreference]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

export default ThemeContext;
