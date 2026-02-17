<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useToast } from "@stratton-cologne/vue-smart-toast";
import api from "@/lib/api";

type GeneralSettingsResponse = {
  default_language: "de" | "en" | "fr" | "it" | "es";
  default_theme: "light" | "dark" | "system";
  license_api_url: string | null;

  contact_company: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;

  mail_from_name: string | null;
  mail_from_address: string | null;
  mail_reply_to: string | null;
  mail_host: string | null;
  mail_port: number | null;
  mail_username: string | null;
  mail_encryption: "tls" | "ssl" | "starttls" | "none";
  mail_use_auth: boolean;
  mail_has_password: boolean;
};

const { showToast } = useToast();
const loading = ref(false);
const saving = ref(false);
const testingMail = ref(false);

const form = ref({
  default_language: "de" as GeneralSettingsResponse["default_language"],
  default_theme: "system" as GeneralSettingsResponse["default_theme"],
  license_api_url: "",

  contact_company: "",
  contact_name: "",
  contact_email: "",
  contact_phone: "",

  mail_from_name: "",
  mail_from_address: "",
  mail_reply_to: "",
  mail_host: "",
  mail_port: "",
  mail_username: "",
  mail_encryption: "none" as GeneralSettingsResponse["mail_encryption"],
  mail_use_auth: true,
  mail_password: "",
  clear_mail_password: false,
});

const testMail = ref({
  recipient: "",
  subject: "SMTP Test - Enterprise Platform",
  message: "",
});

const mailPasswordConfigured = ref(false);

const getApiError = (e: any, fallback: string) => {
  const data = e?.response?.data;
  if (!data) return fallback;
  if (typeof data.message === "string" && data.message.trim().length > 0) return data.message;
  if (typeof data.error === "string" && data.error.trim().length > 0) return data.error;
  return fallback;
};

const mapFromResponse = (payload: GeneralSettingsResponse) => {
  form.value.default_language = payload.default_language;
  form.value.default_theme = payload.default_theme;
  form.value.license_api_url = payload.license_api_url || "";

  form.value.contact_company = payload.contact_company || "";
  form.value.contact_name = payload.contact_name || "";
  form.value.contact_email = payload.contact_email || "";
  form.value.contact_phone = payload.contact_phone || "";

  form.value.mail_from_name = payload.mail_from_name || "";
  form.value.mail_from_address = payload.mail_from_address || "";
  form.value.mail_reply_to = payload.mail_reply_to || "";
  form.value.mail_host = payload.mail_host || "";
  form.value.mail_port = payload.mail_port ? String(payload.mail_port) : "";
  form.value.mail_username = payload.mail_username || "";
  form.value.mail_encryption = payload.mail_encryption;
  form.value.mail_use_auth = payload.mail_use_auth;
  form.value.mail_password = "";
  form.value.clear_mail_password = false;

  mailPasswordConfigured.value = payload.mail_has_password;
  if (!testMail.value.recipient) {
    testMail.value.recipient = payload.contact_email || payload.mail_from_address || "";
  }
};

const loadSettings = async () => {
  loading.value = true;
  try {
    const response = await api.get("/settings/general");
    mapFromResponse(response.data as GeneralSettingsResponse);
  } catch (e: any) {
    showToast({
      key: "settings-general-load-error",
      message: getApiError(e, "Allgemeine Einstellungen konnten nicht geladen werden."),
      type: "danger",
      position: "top-right",
    });
  } finally {
    loading.value = false;
  }
};

const saveSettings = async () => {
  saving.value = true;

  try {
    const payload = {
      default_language: form.value.default_language,
      default_theme: form.value.default_theme,
      license_api_url: form.value.license_api_url || null,

      contact_company: form.value.contact_company || null,
      contact_name: form.value.contact_name || null,
      contact_email: form.value.contact_email || null,
      contact_phone: form.value.contact_phone || null,

      mail_from_name: form.value.mail_from_name || null,
      mail_from_address: form.value.mail_from_address || null,
      mail_reply_to: form.value.mail_reply_to || null,
      mail_host: form.value.mail_host || null,
      mail_port: form.value.mail_port ? Number(form.value.mail_port) : null,
      mail_username: form.value.mail_username || null,
      mail_encryption: form.value.mail_encryption,
      mail_use_auth: form.value.mail_use_auth,
      mail_password: form.value.mail_password || null,
      clear_mail_password: form.value.clear_mail_password,
    };

    const response = await api.put("/settings/general", payload);
    mapFromResponse(response.data as GeneralSettingsResponse);

    showToast({
      key: "settings-general-save-success",
      message: "Allgemeine Einstellungen gespeichert.",
      type: "success",
      position: "top-right",
    });
  } catch (e: any) {
    showToast({
      key: "settings-general-save-error",
      message: getApiError(e, "Allgemeine Einstellungen konnten nicht gespeichert werden."),
      type: "danger",
      position: "top-right",
    });
  } finally {
    saving.value = false;
  }
};

const sendTestMail = async () => {
  if (!testMail.value.recipient.trim()) {
    showToast({
      key: "settings-general-test-mail-recipient-missing",
      message: "Bitte eine Empfängeradresse für die Test-Mail eingeben.",
      type: "warning",
      position: "top-right",
    });
    return;
  }

  testingMail.value = true;
  try {
    await api.post("/settings/general/test-mail", {
      recipient: testMail.value.recipient.trim(),
      subject: testMail.value.subject.trim() || "SMTP Test - Enterprise Platform",
      message: testMail.value.message.trim() || null,
    });

    showToast({
      key: "settings-general-test-mail-success",
      message: "Test-Mail erfolgreich versendet.",
      type: "success",
      position: "top-right",
    });
  } catch (e: any) {
    showToast({
      key: "settings-general-test-mail-error",
      message: getApiError(e, "Test-Mail konnte nicht versendet werden."),
      type: "danger",
      position: "top-right",
    });
  } finally {
    testingMail.value = false;
  }
};

onMounted(async () => {
  await loadSettings();
});
</script>

<template>
  <div class="space-y-6">
    <section class="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div class="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 class="text-xl font-semibold text-zinc-900 dark:text-white">Einstellungen > Allgemein</h2>
          <p class="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Standardwerte, Kontaktdaten, Lizenz-API und Mail-Konfiguration verwalten.
          </p>
        </div>
        <button
          type="button"
          class="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-zinc-900 disabled:opacity-50"
          :disabled="loading || saving"
          @click="saveSettings"
        >
          {{ saving ? "Speichere..." : "Speichern" }}
        </button>
      </div>

      <div v-if="loading" class="text-sm text-zinc-500 dark:text-zinc-400">Lade Einstellungen...</div>

      <div v-else class="space-y-6">
        <div class="grid gap-3 md:grid-cols-3">
          <label class="grid gap-1 text-sm">
            <span class="text-zinc-600 dark:text-zinc-300">Standardsprache</span>
            <select v-model="form.default_language" class="rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950">
              <option value="de">Deutsch</option>
              <option value="en">English</option>
              <option value="fr">Français</option>
              <option value="it">Italiano</option>
              <option value="es">Español</option>
            </select>
          </label>

          <label class="grid gap-1 text-sm">
            <span class="text-zinc-600 dark:text-zinc-300">Standarddesign</span>
            <select v-model="form.default_theme" class="rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950">
              <option value="system">System</option>
              <option value="light">Hell</option>
              <option value="dark">Dunkel</option>
            </select>
          </label>

          <label class="grid gap-1 text-sm md:col-span-1">
            <span class="text-zinc-600 dark:text-zinc-300">Lizenz API URL</span>
            <input
              v-model="form.license_api_url"
              type="url"
              placeholder="https://license.example.local"
              class="rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
            />
          </label>
        </div>

        <div class="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
          <h3 class="mb-3 text-sm font-semibold text-zinc-900 dark:text-white">Kontaktinformationen</h3>
          <div class="grid gap-3 md:grid-cols-2">
            <input v-model="form.contact_company" type="text" placeholder="Unternehmen" class="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950" />
            <input v-model="form.contact_name" type="text" placeholder="Ansprechpartner" class="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950" />
            <input v-model="form.contact_email" type="email" placeholder="kontakt@firma.de" class="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950" />
            <input v-model="form.contact_phone" type="text" placeholder="+49 ..." class="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950" />
          </div>
        </div>

        <div class="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
          <h3 class="mb-3 text-sm font-semibold text-zinc-900 dark:text-white">Mail Einstellungen (SMTP)</h3>
          <div class="grid gap-3 md:grid-cols-2">
            <input v-model="form.mail_from_name" type="text" placeholder="Absendername" class="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950" />
            <input v-model="form.mail_from_address" type="email" placeholder="noreply@firma.de" class="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950" />
            <input v-model="form.mail_reply_to" type="email" placeholder="reply@firma.de" class="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950" />
            <input v-model="form.mail_host" type="text" placeholder="smtp.firma.de" class="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950" />
            <input v-model="form.mail_port" type="number" min="1" max="65535" placeholder="587" class="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950" />
            <input v-model="form.mail_username" type="text" placeholder="SMTP Benutzername" class="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950" />

            <select v-model="form.mail_encryption" class="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950">
              <option value="none">Keine</option>
              <option value="tls">TLS</option>
              <option value="ssl">SSL</option>
              <option value="starttls">STARTTLS</option>
            </select>

            <label class="flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700">
              <input v-model="form.mail_use_auth" type="checkbox" class="h-4 w-4" />
              SMTP Auth verwenden
            </label>

            <input
              v-model="form.mail_password"
              type="password"
              placeholder="Neues SMTP Passwort (optional)"
              class="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950 md:col-span-2"
            />

            <label class="md:col-span-2 flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
              <input v-model="form.clear_mail_password" type="checkbox" class="h-4 w-4" />
              Gespeichertes SMTP Passwort löschen
            </label>

            <p class="md:col-span-2 text-xs" :class="mailPasswordConfigured ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-500 dark:text-zinc-400'">
              Passwortstatus: {{ mailPasswordConfigured ? 'gesetzt' : 'nicht gesetzt' }}
            </p>
          </div>

          <div class="mt-4 rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
            <h4 class="mb-2 text-sm font-semibold text-zinc-900 dark:text-white">Mail-Einstellungen testen</h4>
            <div class="grid gap-3 md:grid-cols-2">
              <input
                v-model="testMail.recipient"
                type="email"
                placeholder="Empfänger (z. B. admin@firma.de)"
                class="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950 md:col-span-2"
              />
              <input
                v-model="testMail.subject"
                type="text"
                placeholder="Betreff"
                class="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950 md:col-span-2"
              />
              <textarea
                v-model="testMail.message"
                rows="3"
                placeholder="Optionale Nachricht für die Test-Mail"
                class="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950 md:col-span-2"
              />
              <button
                type="button"
                class="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                :disabled="loading || saving || testingMail"
                @click="sendTestMail"
              >
                {{ testingMail ? "Sende Test-Mail..." : "Test-Mail senden" }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
