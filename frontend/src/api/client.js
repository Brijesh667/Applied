export class ApiError extends Error {
  constructor(status, message, fieldErrors = null, data = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fieldErrors = fieldErrors;
    this.data = data;
    this.applicationId = data?.applicationId;
  }
}

let unauthorizedHandler = null;

export function setUnauthorizedHandler(fn) {
  unauthorizedHandler = fn;
}

const BASE_URL = (import.meta.env.VITE_API_URL ?? "") + "/api";

function buildQueryString(params) {
  if (!params) return "";
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.append(key, String(value));
    }
  }
  const str = searchParams.toString();
  return str ? `?${str}` : "";
}

async function request(path, options = {}) {
  const { method = "GET", params, body, headers = {} } = options;
  const queryString = buildQueryString(params);
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${BASE_URL}${normalizedPath}${queryString}`;

  const fetchOptions = {
    method,
    headers: {
      Accept: "application/json",
      ...headers,
    },
    credentials: "include",
  };

  if (body !== undefined) {
    if (typeof FormData !== "undefined" && body instanceof FormData) {
      fetchOptions.body = body;
    } else {
      fetchOptions.headers["Content-Type"] = "application/json";
      fetchOptions.body = JSON.stringify(body);
    }
  }

  let response;
  try {
    response = await fetch(url, fetchOptions);
  } catch (_err) {
    throw new ApiError(
      0,
      "Can't reach the server. Check your connection and try again."
    );
  }

  let data = null;
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    const status = response.status;
    const message = data?.message || "Something went wrong";
    const fieldErrors = data?.errors || null;

    const isExempt401Path =
      normalizedPath === "/auth/login" ||
      normalizedPath === "/auth/register" ||
      normalizedPath === "/auth/me";

    if (status === 401) {
      try {
        localStorage.removeItem("session-hint");
      } catch {}
    }

    if (
      status === 401 &&
      !isExempt401Path &&
      typeof unauthorizedHandler === "function"
    ) {
      unauthorizedHandler();
    }

    throw new ApiError(status, message, fieldErrors, data);
  }

  return data;
}

export const api = {
  get: (path, options) => request(path, { ...options, method: "GET" }),
  post: (path, options) => request(path, { ...options, method: "POST" }),
  put: (path, options) => request(path, { ...options, method: "PUT" }),
  patch: (path, options) => request(path, { ...options, method: "PATCH" }),
  delete: (path, options) => request(path, { ...options, method: "DELETE" }),
};

export default api;
