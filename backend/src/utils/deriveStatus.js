export const deriveStatus = (replies) => {
  if (!replies || replies.length === 0) {
    return "applied";
  }

  const decisionReplies = replies.filter(
    (r) => r.type === "offer" || r.type === "rejection"
  );

  if (decisionReplies.length > 0) {
    const latestDecision = decisionReplies.reduce((latest, current) => {
      const latestTime = new Date(latest.receivedDate).getTime();
      const currentTime = new Date(current.receivedDate).getTime();
      return currentTime >= latestTime ? current : latest;
    });

    return latestDecision.type === "offer" ? "offer" : "rejected";
  }

  return "in-process";
};

export default deriveStatus;
