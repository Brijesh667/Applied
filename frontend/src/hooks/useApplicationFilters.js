import { useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { LIMITS, STATUSES } from "../lib/constants.js";
import { normalizeText } from "../lib/normalize.js";

const VALID_SORTS = ["latest", "oldest", "deadline"];
const VALID_DEADLINES = ["missed", "week", "month", "year"];

export function useApplicationFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useMemo(() => {
    const rawSearch = searchParams.get("search") || "";
    const rawStatus = searchParams.get("status") || "";
    const rawAppliedFrom = searchParams.get("appliedFrom") || "";
    const rawReplied = searchParams.get("replied") || "";
    const rawDeadline = searchParams.get("deadline") || "";
    const rawDay = searchParams.get("day") || "";
    const rawSort = searchParams.get("sort") || "";

    const search = normalizeText(rawSearch).slice(0, LIMITS.companyName);
    const status = STATUSES.includes(rawStatus) ? rawStatus : "";
    const appliedFrom = normalizeText(rawAppliedFrom).slice(0, LIMITS.appliedFrom);
    const replied = rawReplied === "true" || rawReplied === "false" ? rawReplied : "";
    const deadline = VALID_DEADLINES.includes(rawDeadline) ? rawDeadline : "";
    const day = deadline === "week" && /^\d{4}-\d{2}-\d{2}$/.test(rawDay) ? rawDay : "";

    // When deadline filter is active and no sort is chosen, default sort is "deadline"
    let sort = "";
    if (VALID_SORTS.includes(rawSort)) {
      sort = rawSort;
    } else {
      sort = deadline ? "deadline" : "latest";
    }

    return {
      search,
      status,
      appliedFrom,
      replied,
      deadline,
      day,
      sort,
    };
  }, [searchParams]);

  const activeCount = useMemo(() => {
    return [
      Boolean(filters.search),
      Boolean(filters.status),
      Boolean(filters.appliedFrom),
      Boolean(filters.replied),
      Boolean(filters.deadline),
      Boolean(filters.day),
    ].filter(Boolean).length;
  }, [filters]);

  const hasActiveFilters = activeCount > 0;

  const setFilter = useCallback(
    (key, value, customOptions) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);

          if (key === "deadline") {
            if (!value || !VALID_DEADLINES.includes(value)) {
              next.delete("deadline");
              next.delete("day");
            } else {
              next.set("deadline", String(value));
              if (value !== "week") {
                next.delete("day");
              }
            }
            return next;
          }

          if (key === "day") {
            if (!value) {
              next.delete("day");
            } else {
              next.set("day", String(value));
            }
            return next;
          }

          const currentDeadline = next.get("deadline");
          const targetDefaultSort = currentDeadline ? "deadline" : "latest";

          const isDefault =
            value === undefined ||
            value === null ||
            value === "" ||
            (key === "sort" && value === targetDefaultSort);

          if (isDefault) {
            next.delete(key);
          } else {
            next.set(key, String(value));
          }
          return next;
        },
        {
          replace: customOptions?.replace ?? (key === "search"),
        }
      );
    },
    [setSearchParams]
  );

  const setFilters = useCallback(
    (newFilters, customOptions) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);

          if (newFilters.deadline !== undefined) {
            if (!newFilters.deadline || !VALID_DEADLINES.includes(newFilters.deadline)) {
              next.delete("deadline");
              next.delete("day");
            } else {
              next.set("deadline", String(newFilters.deadline));
              if (newFilters.deadline !== "week") {
                next.delete("day");
              }
            }
          }

          for (const [key, value] of Object.entries(newFilters)) {
            if (key === "deadline") continue;

            if (key === "day") {
              if (!value) {
                next.delete("day");
              } else {
                next.set("day", String(value));
              }
              continue;
            }

            const currentDeadline = next.get("deadline");
            const targetDefaultSort = currentDeadline ? "deadline" : "latest";

            const isDefault =
              value === undefined ||
              value === null ||
              value === "" ||
              (key === "sort" && value === targetDefaultSort);

            if (isDefault) {
              next.delete(key);
            } else {
              next.set(key, String(value));
            }
          }
          return next;
        },
        {
          replace: customOptions?.replace ?? false,
        }
      );
    },
    [setSearchParams]
  );

  const clearFilters = useCallback(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams();
        const sort = prev.get("sort");
        if (sort && sort !== "latest" && sort !== "deadline") {
          next.set("sort", sort);
        }
        return next;
      },
      { replace: false }
    );
  }, [setSearchParams]);

  return {
    filters,
    setFilter,
    setFilters,
    clearFilters,
    hasActiveFilters,
    activeCount,
  };
}

export default useApplicationFilters;
