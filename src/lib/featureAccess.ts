import api from "@/lib/api";

const STORAGE_KEY = "feature_access_snapshot";

export interface FeatureAccessSnapshot {
  fetchedAt: number;
  modules: Record<string, boolean>;
  activePluginIds: string[];
}

const defaultSnapshot = (): FeatureAccessSnapshot => ({
  fetchedAt: 0,
  modules: {},
  activePluginIds: [],
});

export const readFeatureAccessSnapshot = (): FeatureAccessSnapshot => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return defaultSnapshot();
  try {
    const parsed = JSON.parse(raw);
    return {
      fetchedAt: Number(parsed?.fetchedAt || 0),
      modules: typeof parsed?.modules === "object" && parsed.modules !== null ? parsed.modules : {},
      activePluginIds: Array.isArray(parsed?.activePluginIds) ? parsed.activePluginIds.map(String) : [],
    };
  } catch {
    return defaultSnapshot();
  }
};

export const writeFeatureAccessSnapshot = (snapshot: FeatureAccessSnapshot) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
};

export const clearFeatureAccessSnapshot = () => {
  localStorage.removeItem(STORAGE_KEY);
};

export const fetchFeatureAccessSnapshot = async (): Promise<FeatureAccessSnapshot> => {
  const [entitlementsResponse, pluginsResponse] = await Promise.all([
    api.get("/auth/entitlements/me"),
    api.get("/plugins/active"),
  ]);

  const modulesRaw = Array.isArray(entitlementsResponse?.data?.modules)
    ? entitlementsResponse.data.modules
    : [];

  const moduleMap: Record<string, boolean> = {};
  for (const row of modulesRaw) {
    const key = String(row?.module_key || "");
    if (!key) continue;
    moduleMap[key] = Boolean(row?.entitled);
  }

  const activePluginsRaw = Array.isArray(pluginsResponse?.data) ? pluginsResponse.data : [];
  const activePluginIds = activePluginsRaw
    .map((entry: any) => String(entry?.plugin_id || ""))
    .filter((id: string) => id.length > 0);

  const snapshot: FeatureAccessSnapshot = {
    fetchedAt: Date.now(),
    modules: moduleMap,
    activePluginIds,
  };

  writeFeatureAccessSnapshot(snapshot);
  return snapshot;
};

export const ensureFeatureAccessSnapshot = async (maxAgeMs = 60_000): Promise<FeatureAccessSnapshot> => {
  const cached = readFeatureAccessSnapshot();
  if (cached.fetchedAt > 0 && Date.now() - cached.fetchedAt <= maxAgeMs) {
    return cached;
  }
  return fetchFeatureAccessSnapshot();
};

