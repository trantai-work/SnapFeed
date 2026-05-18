import api from "./api";

export const supportApi = {
  // User endpoints
  createTicket: async (data) => {
    return api.post("/support-tickets", data);
  },
  listUserTickets: async (params = {}) => {
    return api.get("/support-tickets", { params });
  },
  getUserTicket: async (id) => {
    return api.get(`/support-tickets/${id}`);
  },
  replyUserTicket: async (id, replyContent) => {
    return api.post(`/support-tickets/${id}/reply`, { reply_content: replyContent });
  },

  // Moderator endpoints
  listModeratorTickets: async (params = {}) => {
    return api.get("/moderator/support-tickets", { params });
  },
  getModeratorTicket: async (id) => {
    return api.get(`/moderator/support-tickets/${id}`);
  },
  updateTicket: async (id, data) => {
    return api.patch(`/moderator/support-tickets/${id}`, data);
  },
};
