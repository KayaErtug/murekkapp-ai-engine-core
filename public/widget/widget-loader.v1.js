// /public/widget/widget-loader.v1.js
// MurekkAPP Lina WebChat Loader v1
// Bu dosya müşterinin sitesinde çalışır

(function () {
  //--------------------------------------------------
  // 1) DEFAULT CONFIG
  //--------------------------------------------------
  var DEFAULT_CONFIG = {
    customerId: null,                       // ZORUNLU
    apiBaseUrl: "http://localhost:4001",    // AI backend
    widgetUrl: "http://localhost:5173",     // Widget app (iframe)
    position: "br",                         // br | bl | tr | tl
    language: "tr"
  };

  //--------------------------------------------------
  // 2) CONFIG OKU
  //--------------------------------------------------
  function getConfig() {
    var userConfig = window.MUREKKAPP_WIDGET_CONFIG || {};
    var cfg = {};

    for (var key in DEFAULT_CONFIG) {
      cfg[key] = userConfig[key] || DEFAULT_CONFIG[key];
    }

    return cfg;
  }

  var config = getConfig();

  // customerId yoksa HİÇBİR ŞEY YAPMA
  if (!config.customerId) {
    console.warn("[MurekkAPP] customerId bulunamadı, widget yüklenmedi.");
    return;
  }

  //--------------------------------------------------
  // 3) POZİSYON HESABI
  //--------------------------------------------------
  function getPositionStyle(position) {
    var style = {
      bottom: "24px",
      right: "24px",
      top: "auto",
      left: "auto"
    };

    if (position === "bl") {
      style.right = "auto";
      style.left = "24px";
    }

    if (position === "tr") {
      style.bottom = "auto";
      style.top = "24px";
    }

    if (position === "tl") {
      style.bottom = "auto";
      style.right = "auto";
      style.top = "24px";
      style.left = "24px";
    }

    return style;
  }

  //--------------------------------------------------
  // 4) ROOT CONTAINER
  //--------------------------------------------------
  var root = document.createElement("div");
  var pos = getPositionStyle(config.position);

  root.style.position = "fixed";
  root.style.zIndex = "999999";
  root.style.bottom = pos.bottom;
  root.style.right = pos.right;
  root.style.top = pos.top;
  root.style.left = pos.left;
  root.style.fontFamily = "Arial, sans-serif";

  //--------------------------------------------------
  // 5) CHAT BUTTON
  //--------------------------------------------------
  var button = document.createElement("button");

  button.innerHTML = "💬";
  button.style.width = "56px";
  button.style.height = "56px";
  button.style.borderRadius = "50%";
  button.style.border = "none";
  button.style.cursor = "pointer";
  button.style.background = "#111827";
  button.style.color = "#ffffff";
  button.style.fontSize = "22px";
  button.style.boxShadow = "0 10px 25px rgba(0,0,0,0.2)";

  //--------------------------------------------------
  // 6) WIDGET PANEL (IFRAME)
  //--------------------------------------------------
  var panel = document.createElement("div");

  panel.style.width = "360px";
  panel.style.height = "520px";
  panel.style.marginBottom = "12px";
  panel.style.borderRadius = "16px";
  panel.style.overflow = "hidden";
  panel.style.boxShadow = "0 20px 40px rgba(0,0,0,0.25)";
  panel.style.display = "none";
  panel.style.background = "#fff";

  var iframe = null;
  var isOpen = false;

  function buildIframeUrl() {
    var payload = {
      customerId: config.customerId,
      apiBaseUrl: config.apiBaseUrl,
      language: config.language,
      origin: window.location.origin
    };

    var encoded = encodeURIComponent(JSON.stringify(payload));
    return config.widgetUrl + "?config=" + encoded;
  }

  function openPanel() {
    if (!iframe) {
      iframe = document.createElement("iframe");
      iframe.style.width = "100%";
      iframe.style.height = "100%";
      iframe.style.border = "0";
      iframe.src = buildIframeUrl();
      panel.appendChild(iframe);
    }

    panel.style.display = "block";
    isOpen = true;
  }

  function closePanel() {
    panel.style.display = "none";
    isOpen = false;
  }

  button.onclick = function () {
    if (isOpen) closePanel();
    else openPanel();
  };

  //--------------------------------------------------
  // 7) DOM’A EKLE
  //--------------------------------------------------
  root.appendChild(panel);
  root.appendChild(button);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      document.body.appendChild(root);
    });
  } else {
    document.body.appendChild(root);
  }

  //--------------------------------------------------
  // 8) DEBUG LOG
  //--------------------------------------------------
  console.log("[MurekkAPP] Widget loader yüklendi:", config);
})();
