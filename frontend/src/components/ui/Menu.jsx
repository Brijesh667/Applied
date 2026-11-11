/**
 * Menu / Popover component
 * Accessible dropdown menu complying with WAI-ARIA Menu pattern.
 */
import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  createContext,
  useContext,
} from "react";
import { cn } from "../../lib/cn.js";
import { useInteractiveButton } from "../../hooks/useInteractiveButton.js";

const MenuContext = createContext(null);

export function Menu({ children, className = "" }) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef(null);
  const contentRef = useRef(null);
  const previousActiveElement = useRef(null);

  const openMenu = useCallback(() => {
    previousActiveElement.current = document.activeElement;
    setIsOpen(true);
  }, []);

  const closeMenu = useCallback(() => {
    setIsOpen(false);
    if (triggerRef.current) {
      triggerRef.current.focus();
    }
  }, []);

  const toggleMenu = useCallback(() => {
    if (isOpen) {
      closeMenu();
    } else {
      openMenu();
    }
  }, [isOpen, openMenu, closeMenu]);

  // Handle outside click & Escape
  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(e) {
      if (
        contentRef.current?.contains(e.target) ||
        triggerRef.current?.contains(e.target)
      ) {
        return;
      }
      closeMenu();
    }

    function handleKeyDown(e) {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        closeMenu();
        return;
      }

      if (e.key === "Tab") {
        e.preventDefault();
        const items = Array.from(
          contentRef.current?.querySelectorAll(
            '[role="menuitem"]:not([disabled])'
          ) || []
        );
        if (items.length === 0) return;
        const activeIndex = items.indexOf(document.activeElement);
        if (e.shiftKey) {
          const prevIndex = activeIndex > 0 ? activeIndex - 1 : items.length - 1;
          items[prevIndex]?.focus();
        } else {
          const nextIndex = activeIndex < items.length - 1 ? activeIndex + 1 : 0;
          items[nextIndex]?.focus();
        }
        return;
      }

      const items = Array.from(
        contentRef.current?.querySelectorAll(
          '[role="menuitem"]:not([disabled])'
        ) || []
      );

      if (items.length === 0) return;

      const activeIndex = items.indexOf(document.activeElement);

      if (e.key === "ArrowDown") {
        e.preventDefault();
        const nextIndex = activeIndex < items.length - 1 ? activeIndex + 1 : 0;
        items[nextIndex]?.focus();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const prevIndex = activeIndex > 0 ? activeIndex - 1 : items.length - 1;
        items[prevIndex]?.focus();
      } else if (e.key === "Home") {
        e.preventDefault();
        items[0]?.focus();
      } else if (e.key === "End") {
        e.preventDefault();
        items[items.length - 1]?.focus();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, closeMenu]);

  // Focus first item when opening
  useEffect(() => {
    if (isOpen && contentRef.current) {
      const firstItem = contentRef.current.querySelector(
        '[role="menuitem"]:not([disabled])'
      );
      if (firstItem) {
        firstItem.focus();
      }
    }
  }, [isOpen]);

  return (
    <MenuContext.Provider
      value={{
        isOpen,
        openMenu,
        closeMenu,
        toggleMenu,
        triggerRef,
        contentRef,
      }}
    >
      <div className={cn("relative inline-block text-left", className)}>
        {children}
      </div>
    </MenuContext.Provider>
  );
}

export function MenuTrigger({ children, className = "" }) {
  const { isOpen, toggleMenu, triggerRef } = useContext(MenuContext);

  if (typeof children === "function") {
    return children({
      ref: triggerRef,
      "aria-haspopup": "menu",
      "aria-expanded": isOpen,
      onClick: toggleMenu,
    });
  }

  return React.cloneElement(children, {
    ref: triggerRef,
    "aria-haspopup": "menu",
    "aria-expanded": isOpen,
    onClick: (e) => {
      children.props.onClick?.(e);
      toggleMenu();
    },
    className: cn(children.props.className, className),
  });
}

export function MenuContent({
  children,
  className = "",
  align = "right",
}) {
  const { isOpen, contentRef } = useContext(MenuContext);

  if (!isOpen) return null;

  const alignStyles =
    align === "right" ? "right-0 origin-top-right" : "left-0 origin-top-left";

  return (
    <div
      ref={contentRef}
      role="menu"
      tabIndex={-1}
      className={cn(
        "absolute top-full mt-2 z-50 min-w-[220px] rounded-[12px] bg-surface border border-rule p-1.5 shadow-[0_12px_32px_rgb(0_0_0_/_0.18)] transition-all duration-120 motion-reduce:transition-none focus:outline-none",
        alignStyles,
        className
      )}
    >
      {children}
    </div>
  );
}

export function MenuItem({
  children,
  onClick,
  disabled = false,
  className = "",
  danger = false,
  icon: Icon,
}) {
  const { closeMenu } = useContext(MenuContext);

  const { rippleRef, isPressed, handlers } = useInteractiveButton({
    disabled,
    isPrimary: false,
  });

  const handleClick = (e) => {
    if (disabled) return;
    onClick?.(e);
    closeMenu();
  };

  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={handleClick}
      className={cn(
        "btn-interactive w-full flex items-center gap-2.5 px-3 py-2 text-[14px] leading-[20px] rounded-[8px] font-medium text-left select-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:outline-2 focus-visible:outline-[var(--outline-focus)] focus-visible:outline-offset-1 transition-colors duration-[var(--dur-hover)]",
        danger
          ? "text-danger hover:bg-danger-bg focus:bg-danger-bg"
          : "text-ink hover:bg-sunken focus:bg-sunken",
        isPressed && "is-pressed",
        className
      )}
      {...handlers}
    >
      <span ref={rippleRef} className="btn-ripple-container" aria-hidden="true" />
      <span className="relative z-[2] inline-flex items-center gap-2.5 w-full min-w-0">
        {Icon && (
          <Icon className="w-4 h-4 shrink-0 text-current opacity-80" aria-hidden="true" />
        )}
        <span className="truncate">{children}</span>
      </span>
    </button>
  );
}

export function MenuDivider({ className = "" }) {
  return (
    <div
      role="separator"
      className={cn("my-1.5 border-t border-rule", className)}
    />
  );
}

export function MenuHeader({ children, className = "" }) {
  return (
    <div className={cn("px-3 py-2 text-left", className)}>
      {children}
    </div>
  );
}

export default Menu;
