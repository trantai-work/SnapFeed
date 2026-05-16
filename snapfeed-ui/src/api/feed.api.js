import api from "./api";

export const feedApi = {
  getFeeds: async (params = {}) => {
    return api.get("/videos/feeds", { params });
  },
  getTrending: async (params = {}) => {
    return api.get("/videos/trending", { params });
  },
  getFollowing: async (params = {}) => {
    return api.get("/videos/following", { params });
  },
};
