/**
 * UserMenu component
 * Accessible user profile popover menu.
 * Redesigned header block with 40px avatar, name, and email.
 * Links to Dashboard and Applications, followed by Log out action.
 */
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { Avatar, getInitials } from "../ui/Avatar.jsx";
import {
  Menu,
  MenuTrigger,
  MenuContent,
  MenuItem,
  MenuDivider,
  MenuHeader,
} from "../ui/Menu.jsx";

export function UserMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const initials = getInitials(user?.name) || "U";

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await logout();
    } catch {
      setIsLoggingOut(false);
    }
  };

  return (
    <Menu>
      <MenuTrigger>
        <button
          type="button"
          className="inline-flex items-center justify-center w-9 h-9 rounded-full text-ink hover:bg-sunken transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2 cursor-pointer select-none"
          aria-label={`${initials} - User menu`}
        >
          <Avatar name={user?.name} size="sm" />
        </button>
      </MenuTrigger>

      <MenuContent
        align="right"
        className="w-[calc(100vw-32px)] sm:w-[280px] max-w-[320px]"
      >
        {/* Header Block: 40px avatar, name (semibold), email (muted, truncate) */}
        <MenuHeader className="px-3 py-2.5">
          <div className="flex items-center gap-3">
            <Avatar name={user?.name} size="md" className="shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-[14px] leading-[20px] text-ink truncate">
                {user?.name || "User"}
              </div>
              <div
                className="text-[12px] leading-[16px] text-ink-soft truncate mt-0.5"
                title={user?.email || ""}
              >
                {user?.email || ""}
              </div>
            </div>
          </div>
        </MenuHeader>

        <MenuDivider />

        {/* Menu Items (min-h-[44px]) */}
        <MenuItem
          onClick={() => navigate("/dashboard")}
          className="min-h-[44px]"
        >
          Dashboard
        </MenuItem>

        <MenuItem
          onClick={() => navigate("/applications")}
          className="min-h-[44px]"
        >
          Applications
        </MenuItem>

        <MenuDivider />

        {/* Log out */}
        <MenuItem
          onClick={handleLogout}
          disabled={isLoggingOut}
          danger
          className="min-h-[44px]"
        >
          {isLoggingOut ? "Logging out..." : "Log out"}
        </MenuItem>
      </MenuContent>
    </Menu>
  );
}

export default UserMenu;
