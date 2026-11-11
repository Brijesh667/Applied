import { useState } from "react";
import { toast } from "sonner";
import { resumesApi } from "../api/endpoints.js";

export function useResumeDownload() {
  const [downloadingId, setDownloadingId] = useState(null);

  const download = async (resumeId) => {
    if (!resumeId) return;
    setDownloadingId(resumeId);

    // Open blank tab immediately to avoid browser popup blockers
    let newTab = null;
    try {
      newTab = window.open("", "_blank");
      if (newTab) {
        newTab.opener = null;
      }
    } catch {
      // popup blocker
    }

    try {
      const data = await resumesApi.download(resumeId);
      if (data?.url) {
        if (newTab && !newTab.closed) {
          newTab.location.href = data.url;
        } else {
          window.open(data.url, "_blank", "noopener,noreferrer");
        }
      } else {
        throw new Error("Missing download URL");
      }
    } catch (_err) {
      if (newTab && !newTab.closed) {
        try {
          newTab.close();
        } catch {}
      }
      toast.error("Couldn't open resume file. Try again.");
    } finally {
      setDownloadingId(null);
    }
  };

  return {
    download,
    isDownloading: Boolean(downloadingId),
    downloadingId,
  };
}

export default useResumeDownload;
