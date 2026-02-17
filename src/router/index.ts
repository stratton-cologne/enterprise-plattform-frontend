import { createRouter, createWebHistory } from "vue-router";
import { ensureFeatureAccessSnapshot } from "@/lib/featureAccess";
import { clearSession, getToken, isSessionExpired } from "@/lib/session";

const router = createRouter({
    history: createWebHistory(),
    routes: [
        {
            path: "/login",
            name: "Login",
            component: () => import("@/pages/Login.vue"),
            meta: { layout: "auth" },
        },
        {
            path: "/",
            name: "Dashboard",
            component: () => import("@/pages/Dashboard.vue"),
            meta: { requiresAuth: true, layout: "main", title: "Dashboard" },
        },
        {
            path: "/users",
            name: "Users",
            component: () => import("@/pages/Users.vue"),
            meta: { requiresAuth: true, layout: "main", title: "Benutzer", requiredModule: "security" },
        },
        {
            path: "/roles",
            name: "Roles",
            component: () => import("@/pages/Roles.vue"),
            meta: { requiresAuth: true, layout: "main", title: "Rollen & Rechte", requiredModule: "security" },
        },
        {
            path: "/profile",
            name: "Profile",
            component: () => import("@/pages/Profile.vue"),
            meta: { requiresAuth: true, layout: "main", title: "Mein Profil" },
        },
        {
            path: "/settings/general",
            name: "SettingsGeneral",
            component: () => import("@/pages/SettingsGeneral.vue"),
            meta: { requiresAuth: true, layout: "main", title: "Einstellungen > Allgemein" },
        },
        {
            path: "/settings/licenses",
            name: "SettingsLicenses",
            component: () => import("@/pages/SettingsLicenses.vue"),
            meta: { requiresAuth: true, layout: "main", title: "Einstellungen > Lizenzen" },
        },
    ],
});

router.beforeEach(async (to) => {
    const token = getToken();
    if (token && isSessionExpired()) {
        clearSession();
    }
    const activeToken = getToken();
    if (to.meta.requiresAuth && !activeToken) {
        return { name: "Login" };
    }
    if (to.name === "Login" && activeToken) {
        return { name: "Dashboard" };
    }

    if (to.meta.requiresAuth) {
        try {
            const snapshot = await ensureFeatureAccessSnapshot();
            const requiredModule = typeof to.meta.requiredModule === "string" ? to.meta.requiredModule : "";
            const requiredPlugin = typeof to.meta.requiredPlugin === "string" ? to.meta.requiredPlugin : "";

            if (requiredModule && snapshot.modules[requiredModule] !== true) {
                return { name: "Dashboard" };
            }
            if (requiredPlugin && !snapshot.activePluginIds.includes(requiredPlugin)) {
                return { name: "Dashboard" };
            }
        } catch (error: any) {
            const status = error?.response?.status;
            if (status === 401) {
                clearSession();
                return { name: "Login" };
            }
            if (status === 403) {
                if (to.name === "Dashboard") {
                    return true;
                }
                return { name: "Dashboard" };
            }
            // fallback: keep navigation if access snapshot could not be refreshed
            if (!to.meta.requiresAuth) {
                return true;
            }
        }
    }

    return true;
});

export default router;
