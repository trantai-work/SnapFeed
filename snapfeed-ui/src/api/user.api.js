import api from "./api";

export const usersApi = {
  me: async () => {
    const data = await api.get("/users/me");
    return data
  },
};