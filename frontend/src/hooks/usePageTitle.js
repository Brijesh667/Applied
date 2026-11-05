import { useEffect } from "react";
import { APP_NAME } from "../lib/brand.js";

export function usePageTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} | ${APP_NAME}` : APP_NAME;
  }, [title]);
}

export default usePageTitle;
