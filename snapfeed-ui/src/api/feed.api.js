import api from "./api";

export const feedApi = {
  getFeeds: async (params = {}) => {
    return api.get("/videos/feeds", { params });
  },
};
