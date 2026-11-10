export const queryKeys = {
  me: ["auth", "me"],
  applications: {
    all: ["applications"],
    lists: () => ["applications", "list"],
    list: (params = {}) => ["applications", "list", params],
    detail: (id) => ["applications", "detail", id],
  },
  resumes: {
    all: ["resumes"],
    lists: () => ["resumes", "list"],
    list: () => ["resumes", "list"],
    detail: (id) => ["resumes", "detail", id],
  },
  jobs: {
    all: ["jobs"],
    latest: (resumeId) => ["jobs", "latest", resumeId],
    results: (searchId, params = {}) => ["jobs", "results", searchId, params],
  },
  stats: ["stats"],
};

export default queryKeys;
