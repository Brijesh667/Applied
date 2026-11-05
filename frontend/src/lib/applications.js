/**
 * Application domain helpers
 */
export function getLatestReply(replies = []) {
  if (!Array.isArray(replies) || replies.length === 0) return null;
  const sorted = [...replies].sort(
    (a, b) => new Date(b.receivedDate).getTime() - new Date(a.receivedDate).getTime()
  );
  return sorted[0] || null;
}

export function getNextPendingReply(replies = [], nextDeadline) {
  if (!Array.isArray(replies) || !nextDeadline) return null;
  const targetTime = new Date(nextDeadline).getTime();
  return (
    replies.find((r) => {
      if (r.completed) return false;
      if (!r.deadline) return false;
      return new Date(r.deadline).getTime() === targetTime;
    }) || null
  );
}

export function computeNextDeadline(replies = []) {
  if (!Array.isArray(replies) || replies.length === 0) return null;
  const pending = replies.filter((r) => !r.completed && Boolean(r.deadline));
  if (pending.length === 0) return null;
  pending.sort(
    (a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
  );
  return pending[0].deadline;
}

export function getStatusColorVar(status) {
  switch (status) {
    case "applied":
      return "var(--color-status-applied-fg)";
    case "in-process":
      return "var(--color-status-in-process-fg)";
    case "offer":
      return "var(--color-status-offer-fg)";
    case "rejected":
      return "var(--color-status-rejected-fg)";
    default:
      return "var(--color-status-applied-fg)";
  }
}
