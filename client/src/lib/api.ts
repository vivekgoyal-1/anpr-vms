import { apiRequest } from "./queryClient";

// Auth API
export const authApi = {
  login: (email: string, password: string) =>
    apiRequest("POST", "/api/auth/login", { email, password }),
  
  register: (email: string, password: string) =>
    apiRequest("POST", "/api/auth/register", { email, password }),
};

// Camera API
export const cameraApi = {
  getCameras: () => fetch("/api/cameras", { 
    headers: { Authorization: `Bearer ${localStorage.getItem("auth-token")}` }
  }),
  
  getCamera: (id: string) => fetch(`/api/cameras/${id}`, {
    headers: { Authorization: `Bearer ${localStorage.getItem("auth-token")}` }
  }),
  
  createCamera: (data: any) =>
    apiRequest("POST", "/api/cameras", data),
  
  updateCamera: (id: string, data: any) =>
    apiRequest("PUT", `/api/cameras/${id}`, data),
  
  deleteCamera: (id: string) =>
    apiRequest("DELETE", `/api/cameras/${id}`),
  
  startRecording: (id: string) =>
    apiRequest("POST", `/api/cameras/${id}/start-record`),
  
  stopRecording: (id: string) =>
    apiRequest("POST", `/api/cameras/${id}/stop-record`),
  
  takeSnapshot: (id: string) =>
    apiRequest("POST", `/api/cameras/${id}/snapshot`),
};

// Recording API
export const recordingApi = {
  getRecordings: (filters?: any) => {
    const params = new URLSearchParams(filters);
    return fetch(`/api/recordings?${params}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("auth-token")}` }
    });
  },
};

// ANPR API
export const anprApi = {
  getEvents: (filters?: any) => {
    const params = new URLSearchParams(filters);
    return fetch(`/api/anpr/events?${params}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("auth-token")}` }
    });
  },
};

// System API
export const systemApi = {
  getStats: () => fetch("/api/system/stats", {
    headers: { Authorization: `Bearer ${localStorage.getItem("auth-token")}` }
  }),
};
