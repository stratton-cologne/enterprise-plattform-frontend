import axios from "axios";
import { clearSession, getToken } from "@/lib/session";

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || "/api",
    headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
    },
});

api.interceptors.request.use((config) => {
    const token = getToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error.response?.status;
        const message = error.response?.data?.error;
        if (status === 401 || (status === 403 && message === "MFA verification required")) {
            clearSession();
            window.location.href = "/login";
        }
        return Promise.reject(error);
    },
);

export default api;
