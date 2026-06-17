import api from "./api";

export const recommendationApi = {
  searchUsers: async (q) => {
    return api.get("/moderator/user-preferences/search-users", { params: { q } });
  },
  getUserPreferences: async (userId) => {
    return api.get(`/moderator/user-preferences/${userId}/preferences`);
  },
};
