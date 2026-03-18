import api from "./api";

export const authApi = {
  logout: async () => {
    return api.post("/auth/logout");
  },
};
