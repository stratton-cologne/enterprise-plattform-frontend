<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useToast } from "@stratton-cologne/vue-smart-toast";
import api from "@/lib/api";
import { fetchFeatureAccessSnapshot } from "@/lib/featureAccess";

type LicenseModuleStatus = {
  module_key: string;
  module_name: string;
  description?: string | null;
  entitled: boolean;
  valid_until?: string | null;
  synced_at?: string | null;
};

type LicenseStatusResponse = {
  source: string;
  license_service_base_url: string;
  has_tenant_token: boolean;
  last_synced_at?: string | null;
  modules_total: number;
  modules_entitled: number;
  modules: LicenseModuleStatus[];
};

const loading = ref(false);
const activating = ref(false);
const syncing = ref(false);
const keyCode = ref("");
const status = ref<LicenseStatusResponse | null>(null);

const { showToast } = useToast();

const getApiError = (e: any, fallback: string) => {
  const data = e?.response?.data;
  if (!data) return fallback;
  if (typeof data.message === "string" && data.message.trim().length > 0) return data.message;
  if (typeof data.error === "string" && data.error.trim().length > 0) return data.error;
  return fallback;
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("de-DE");
};

const entitledModules = computed(() =>
  (status.value?.modules || []).filter((mod) => mod.entitled)
);

const loadStatus = async () => {
  loading.value = true;
  try {
    const response = await api.get("/settings/licenses/status");
    status.value = response.data;
  } catch (e: any) {
    showToast({
      key: "tenant-license-status-error",
      message: getApiError(e, "Lizenzstatus konnte nicht geladen werden."),
      type: "danger",
      position: "top-right",
    });
  } finally {
    loading.value = false;
  }
};

const activateKey = async () => {
  const normalized = keyCode.value.trim();
  if (!normalized) {
    showToast({
      key: "tenant-license-key-missing",
      message: "Bitte einen Lizenzkey eingeben.",
      type: "warning",
      position: "top-right",
    });
    return;
  }

  activating.value = true;
  try {
    await api.post("/settings/licenses/activate-key", { key_code: normalized });
    keyCode.value = "";
    await Promise.all([loadStatus(), fetchFeatureAccessSnapshot()]);
    showToast({
      key: "tenant-license-activate-success",
      message: "Lizenzkey erfolgreich aktiviert.",
      type: "success",
      position: "top-right",
    });
  } catch (e: any) {
    showToast({
      key: "tenant-license-activate-error",
      message: getApiError(e, "Lizenzkey konnte nicht aktiviert werden."),
      type: "danger",
      position: "top-right",
    });
  } finally {
    activating.value = false;
  }
};

const syncEntitlements = async () => {
  syncing.value = true;
  try {
    await api.post("/settings/licenses/sync");
    await Promise.all([loadStatus(), fetchFeatureAccessSnapshot()]);
    showToast({
      key: "tenant-license-sync-success",
      message: "Lizenzstatus synchronisiert.",
      type: "success",
      position: "top-right",
    });
  } catch (e: any) {
    showToast({
      key: "tenant-license-sync-error",
      message: getApiError(e, "Synchronisierung fehlgeschlagen."),
      type: "danger",
      position: "top-right",
    });
  } finally {
    syncing.value = false;
  }
};

onMounted(async () => {
  await loadStatus();
});
</script>

<template>
  <div class="space-y-6">
    <section class="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 class="text-xl font-semibold text-zinc-900 dark:text-white">Einstellungen > Lizenzen</h2>
          <p class="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Tenant-Lizenz über zentralen License Manager aktivieren.
          </p>
        </div>
        <button
          type="button"
          class="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          :disabled="syncing || loading"
          @click="syncEntitlements"
        >
          {{ syncing ? "Synchronisiere..." : "Status synchronisieren" }}
        </button>
      </div>

      <div class="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
        <input
          v-model="keyCode"
          type="text"
          placeholder="Lizenzkey eingeben (z. B. LIC-XXXX-XXXX)"
          class="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
        />
        <button
          type="button"
          class="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-zinc-900 disabled:opacity-50"
          :disabled="activating || loading"
          @click="activateKey"
        >
          {{ activating ? "Aktiviere..." : "Lizenz aktivieren" }}
        </button>
      </div>

      <div class="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div class="rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-950">
          <p class="text-xs text-zinc-500 dark:text-zinc-400">Quelle</p>
          <p class="mt-1 text-sm font-semibold text-zinc-900 dark:text-white">
            {{ status?.source || "central_license_service" }}
          </p>
        </div>
        <div class="rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-950">
          <p class="text-xs text-zinc-500 dark:text-zinc-400">License API</p>
          <p class="mt-1 text-sm font-semibold text-zinc-900 dark:text-white break-all">
            {{ status?.license_service_base_url || "—" }}
          </p>
        </div>
        <div class="rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-950">
          <p class="text-xs text-zinc-500 dark:text-zinc-400">Tenant-Token</p>
          <p class="mt-1 text-sm font-semibold" :class="status?.has_tenant_token ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'">
            {{ status?.has_tenant_token ? "konfiguriert" : "fehlt" }}
          </p>
        </div>
        <div class="rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-950">
          <p class="text-xs text-zinc-500 dark:text-zinc-400">Letzter Sync</p>
          <p class="mt-1 text-sm font-semibold text-zinc-900 dark:text-white">
            {{ formatDateTime(status?.last_synced_at) }}
          </p>
        </div>
      </div>
    </section>

    <section class="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 class="text-sm font-semibold text-zinc-900 dark:text-white">Modulstatus (read-only)</h3>
        <div class="text-xs text-zinc-500 dark:text-zinc-400">
          {{ status?.modules_entitled || 0 }} / {{ status?.modules_total || 0 }} lizenziert
        </div>
      </div>

      <div v-if="loading" class="text-sm text-zinc-500 dark:text-zinc-400">Lade Lizenzstatus...</div>

      <div v-else class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <div
          v-for="mod in status?.modules || []"
          :key="mod.module_key"
          class="rounded-xl border p-4"
          :class="mod.entitled
            ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30'
            : 'border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950'"
        >
          <div class="flex items-start justify-between gap-2">
            <div>
              <p class="font-semibold text-zinc-900 dark:text-white">{{ mod.module_name }}</p>
              <p class="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{{ mod.module_key }}</p>
            </div>
            <span
              class="rounded-md border px-2 py-1 text-xs font-semibold"
              :class="mod.entitled
                ? 'border-emerald-300 text-emerald-700 dark:border-emerald-700 dark:text-emerald-300'
                : 'border-zinc-300 text-zinc-600 dark:border-zinc-600 dark:text-zinc-400'"
            >
              {{ mod.entitled ? "Aktiv" : "Gesperrt" }}
            </span>
          </div>
          <p class="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
            {{ mod.description || "Keine Beschreibung" }}
          </p>
          <p class="mt-2 text-xs text-zinc-500 dark:text-zinc-500">
            Gültig bis: {{ formatDateTime(mod.valid_until) }}
          </p>
        </div>
      </div>

      <div
        v-if="!loading && entitledModules.length === 0"
        class="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300"
      >
        Aktuell ist kein Modul lizenziert. Bitte einen gültigen Lizenzkey aktivieren.
      </div>
    </section>
  </div>
</template>

