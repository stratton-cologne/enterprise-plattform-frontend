import { createApp } from "vue";
import { createPinia } from "pinia";
import "./style.css";
import App from "./App.vue";
import router from "./router";
import ToastPlugin from "@stratton-cologne/vue-smart-toast";
import "@stratton-cologne/vue-smart-toast/style.css";

window.addEventListener("session-expired", () => {
    if (router.currentRoute.value.name !== "Login") {
        router.replace({ name: "Login" });
    }
});

const app = createApp(App);
app.use(createPinia());
app.use(router);
app.use(ToastPlugin);
app.mount("#app");
