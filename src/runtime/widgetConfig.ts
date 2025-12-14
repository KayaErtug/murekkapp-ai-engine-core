// /src/runtime/widgetConfig.ts
// Widget iframe URL'sinden gelen config'i okur

type WidgetRuntimeConfig = {
  customerId?: string;
  apiBaseUrl?: string;
  language?: string;
  sector?: string;
  origin?: string;
};

function parseConfigFromUrl(): WidgetRuntimeConfig {
  try {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get("config");

    if (!raw) return {};

    const decoded = decodeURIComponent(raw);
    const parsed = JSON.parse(decoded);

    return parsed || {};
  } catch (err) {
    console.warn("[MurekkAPP] Widget config parse edilemedi", err);
    return {};
  }
}

// GLOBAL'e yazıyoruz (tek kaynak)
export const WIDGET_RUNTIME_CONFIG: WidgetRuntimeConfig = parseConfigFromUrl();

// Debug için (sonra kaldırılır)
console.log("[MurekkAPP] Runtime widget config:", WIDGET_RUNTIME_CONFIG);
