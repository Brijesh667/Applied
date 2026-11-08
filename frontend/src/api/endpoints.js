import { api } from "./client.js";

export const authApi = {
  me: async () => {
    const data = await api.get("/auth/me");
    return data?.user ?? null;
  },
  login: async (body) => {
    return api.post("/auth/login", { body });
  },
  register: async (body) => {
    return api.post("/auth/register", { body });
  },
  logout: async () => {
    return api.post("/auth/logout");
  },
};

export const applicationsApi = {
  list: async (params) => {
    return api.get("/applications", { params });
  },
  get: async (id) => {
    const res = await api.get(`/applications/${id}`);
    return res?.application ?? res;
  },
  create: async (body) => {
    const res = await api.post("/applications", { body });
    return res?.application ?? res;
  },
  update: async (id, body) => {
    const res = await api.put(`/applications/${id}`, { body });
    return res?.application ?? res;
  },
  remove: async (id) => {
    return api.delete(`/applications/${id}`);
  },
  addReply: async (id, body) => {
    const res = await api.post(`/applications/${id}/replies`, { body });
    return res?.application ?? res;
  },
  updateReply: async (id, replyId, body) => {
    const res = await api.patch(`/applications/${id}/replies/${replyId}`, { body });
    return res?.application ?? res;
  },
  deleteReply: async (id, replyId) => {
    const res = await api.delete(`/applications/${id}/replies/${replyId}`);
    return res?.application ?? res;
  },
};

export const statsApi = {
  get: async () => {
    return api.get("/stats");
  },
};

export const resumesApi = {
  list: async () => {
    return api.get("/resumes");
  },
  get: async (id) => {
    const res = await api.get(`/resumes/${id}`);
    return res?.resume ?? res;
  },
  upload: async (formData) => {
    return api.post("/resumes", { body: formData });
  },
  update: async (id, body) => {
    return api.patch(`/resumes/${id}`, { body });
  },
  reparse: async (id) => {
    return api.post(`/resumes/${id}/reparse`);
  },
  download: async (id) => {
    return api.get(`/resumes/${id}/download`);
  },
  remove: async (id) => {
    return api.delete(`/resumes/${id}`);
  },
};

export const jobsApi = {
  search: async ({ resumeId, refresh = false }) => {
    return api.post("/jobs/search", { body: { resumeId, refresh } });
  },
  track: async ({ resumeId, jobId }) => {
    return api.post("/jobs/track", { body: { resumeId, jobId } });
  },
};

export default {
  auth: authApi,
  applications: applicationsApi,
  stats: statsApi,
  resumes: resumesApi,
  jobs: jobsApi,
};
