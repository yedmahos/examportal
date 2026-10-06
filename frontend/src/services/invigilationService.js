import { get, post, put, del } from "./api";

const queryString = (params = {}) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") search.append(key, value);
  });
  const query = search.toString();
  return query ? `?${query}` : "";
};

export const invigilationService = {
  board: (scheduleId) => get(`/invigilation/schedule/${scheduleId}`),
  preview: (body) => post("/invigilation/preview", body),
  assign: (body) => post("/invigilation", body),
  generate: (body) => post("/invigilation/generate", body),
  confirm: (body) => post("/invigilation/bulk", body),
  mine: () => get("/invigilation/faculty/me"),
  workload: () => get("/invigilation/workload"),
  update: (id, body) => put(`/invigilation/${id}`, body),
  remove: (id) => del(`/invigilation/${id}`),
  availability: (params) => get(`/invigilation/availability${queryString(params)}`),
  saveAvailability: (body) => put("/invigilation/availability", body),
};
