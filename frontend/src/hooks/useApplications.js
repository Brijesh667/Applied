import { useInfiniteQuery, keepPreviousData } from "@tanstack/react-query";
import { applicationsApi } from "../api/endpoints.js";
import { queryKeys } from "../api/queryKeys.js";

/**
 * Computes backend query params (due, dueFrom, dueTo) from local deadline & day filters.
 * Mapping (computed in client in LOCAL time, sent as ISO):
 * - Missed -> due=missed
 * - This week -> next 7 days : dueFrom = now, dueTo = start of today + 8 days
 * - This month -> dueFrom = now, dueTo = start of next calendar month
 * - This year -> dueFrom = now, dueTo = start of next calendar year
 * - Specific day in week -> dueFrom = local day start, dueTo = next day start
 */
export function computeDeadlineParams(deadline, day) {
  if (!deadline) return {};

  if (deadline === "missed") {
    return { due: "missed" };
  }

  const now = new Date();

  if (deadline === "week") {
    if (day && /^\d{4}-\d{2}-\d{2}$/.test(day)) {
      const [year, month, date] = day.split("-").map(Number);
      const dayStart = new Date(year, month - 1, date, 0, 0, 0, 0);
      const nextDayStart = new Date(year, month - 1, date + 1, 0, 0, 0, 0);
      return {
        dueFrom: dayStart.toISOString(),
        dueTo: nextDayStart.toISOString(),
      };
    }

    const endOfWeek = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 8,
      0,
      0,
      0,
      0
    );
    return {
      dueFrom: now.toISOString(),
      dueTo: endOfWeek.toISOString(),
    };
  }

  if (deadline === "month") {
    const startOfNextMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      1,
      0,
      0,
      0,
      0
    );
    return {
      dueFrom: now.toISOString(),
      dueTo: startOfNextMonth.toISOString(),
    };
  }

  if (deadline === "year") {
    const startOfNextYear = new Date(
      now.getFullYear() + 1,
      0,
      1,
      0,
      0,
      0,
      0
    );
    return {
      dueFrom: now.toISOString(),
      dueTo: startOfNextYear.toISOString(),
    };
  }

  return {};
}

function cleanFilterParams(filters = {}) {
  const clean = {};
  if (filters.search) clean.search = filters.search.trim();
  if (filters.status) clean.status = filters.status;
  if (filters.appliedFrom) clean.appliedFrom = filters.appliedFrom.trim();
  if (filters.replied !== undefined && filters.replied !== "") clean.replied = filters.replied;

  // Deadline mapping
  const deadlineParams = computeDeadlineParams(filters.deadline, filters.day);
  Object.assign(clean, deadlineParams);

  // When a deadline filter is active and no sort is chosen, sort = deadline
  if (filters.deadline) {
    clean.sort = filters.sort || "deadline";
  } else if (filters.sort && filters.sort !== "latest") {
    clean.sort = filters.sort;
  }

  return clean;
}

export function useApplications(filters = {}) {
  const cleanParams = cleanFilterParams(filters);

  const query = useInfiniteQuery({
    queryKey: queryKeys.applications.list({
      ...cleanParams,
      deadline: filters.deadline || "",
      day: filters.day || "",
    }),
    initialPageParam: 1,
    queryFn: async ({ pageParam = 1 }) => {
      return applicationsApi.list({
        ...cleanParams,
        page: pageParam,
      });
    },
    getNextPageParam: (lastPage) => {
      return lastPage?.hasMore ? lastPage.page + 1 : undefined;
    },
    placeholderData: keepPreviousData,
  });

  // Deduplicate items by _id across loaded pages
  const seen = new Set();
  const applications =
    query.data?.pages?.flatMap((page) => page?.applications || []).filter((item) => {
      if (!item?._id) return false;
      if (seen.has(item._id)) return false;
      seen.add(item._id);
      return true;
    }) || [];

  const total = query.data?.pages?.[0]?.total ?? 0;

  return {
    applications,
    total,
    fetchNextPage: query.fetchNextPage,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    isPending: query.isPending,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    isPlaceholderData: query.isPlaceholderData,
  };
}

export default useApplications;
