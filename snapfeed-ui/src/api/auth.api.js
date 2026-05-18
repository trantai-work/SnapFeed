import api from "./api";

export const authApi = {
  login: async ({ username, password }) => {
    return api.post("/auth/login", { username, password });
  },
  logout: async () => {
    return api.post("/auth/logout");
  },
};
