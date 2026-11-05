import { useEffect } from "react";

export function usePageMeta({ noindex = false, description } = {}) {
  useEffect(() => {
    let robotsMeta = document.querySelector('meta[name="robots"]');

    if (noindex) {
      if (!robotsMeta) {
        robotsMeta = document.createElement("meta");
        robotsMeta.setAttribute("name", "robots");
        document.head.appendChild(robotsMeta);
      }
      robotsMeta.setAttribute("content", "noindex, nofollow");
    } else if (robotsMeta) {
      robotsMeta.remove();
    }

    let originalDesc = null;
    let descMeta = document.querySelector('meta[name="description"]');
    let ogDescMeta = document.querySelector('meta[property="og:description"]');

    if (description) {
      if (descMeta) {
        originalDesc = descMeta.getAttribute("content");
        descMeta.setAttribute("content", description);
      }
      if (ogDescMeta) {
        ogDescMeta.setAttribute("content", description);
      }
    }

    return () => {
      if (noindex && robotsMeta && robotsMeta.parentNode) {
        robotsMeta.remove();
      }
      if (description && originalDesc && descMeta) {
        descMeta.setAttribute("content", originalDesc);
      }
    };
  }, [noindex, description]);
}

export default usePageMeta;
