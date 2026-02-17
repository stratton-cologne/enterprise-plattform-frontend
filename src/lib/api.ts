import axios from "axios";
import { clearSession, getToken } from "@/lib/session";

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || "/api",
    headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
    },
});

let sessionExpiryHandled = false;

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
        const requestUrl = String(error.config?.url || "");
        const isLoginRequest = requestUrl.includes("/auth/login");

        if (
            !sessionExpiryHandled &&
            !isLoginRequest &&
            (status === 401 ||
                (status === 403 && message === "MFA verification required"))
        ) {
            sessionExpiryHandled = true;
            clearSession();
            window.dispatchEvent(new CustomEvent("session-expired"));
        }

        return Promise.reject(error);
    },
);

export default api;
