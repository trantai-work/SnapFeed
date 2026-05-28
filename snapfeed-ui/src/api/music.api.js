import api from "./api";

export const musicApi = {
  list: async (search = "") => {
    const params = {};
    if (search) {
      params.search = search;
    }
    const response = await api.get("/music", { params });
    if (response && Array.isArray(response.results)) {
      return response.results;
    }
    return Array.isArray(response) ? response : [];
  },
  create: async (formData) => {
    return api.post("/music", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },
  update: async (id, formData) => {
    return api.patch(`/music/${id}`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },
  delete: async (id) => {
    return api.delete(`/music/${id}`);
  },
};
