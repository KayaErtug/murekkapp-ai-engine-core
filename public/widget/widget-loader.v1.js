// /public/widget/widget-loader.v1.js
// MurekkAPP Lina WebChat Loader v2 (Multi-Channel + Live)
// Bu dosya müşterinin sitesinde çalışır.

(function () {
  //--------------------------------------------------
  // 1) DEFAULT CONFIG
  //--------------------------------------------------
  var DEFAULT_CONFIG = {
    customerId: null,                       // ZORUNLU
    // 👇 ÖNEMLİ: Buraya kendi Render Backend adresini yazmalısın.
    // Örnek: "https://murekkapp-backend.onrender.com"
    apiBaseUrl: "https://murekkapp-ai-engine-core.onrender.com", 
    
    // 👇 Canlı site adresi (Widget iframe burada)
    widgetUrl: "https://murekkapp.com",     
    
    position: "br",                         // br | bl | tr | tl
    language: "tr",
    
    // Sosyal Medya Ayarları
    whatsappNumber: "902589110718",         // Senin numaran
    instagramUser: "murekkapp",             // Instagram kullanıcı adı
    messengerUser: "murekkapp",             // Messenger kullanıcı adı
    socialsOpen: false                      // Başlangıçta kapalı
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
  // 3) POZİSYON VE STİL (Flexbox Güncellemesi)
  //--------------------------------------------------
  function getPositionStyle(position) {
    // Sosyal butonları dikey dizmek için flex ayarları ekledik
    var style = { 
      bottom: "24px", 
      right: "24px", 
      top: "auto", 
      left: "auto", 
      flexDirection: "column-reverse", 
      alignItems: "flex-end" 
    };

    if (position === "bl") { 
      style.right = "auto"; 
      style.left = "24px"; 
      style.alignItems = "flex-start"; 
    }

    if (position === "tr") { 
      style.bottom = "auto"; 
      style.top = "24px"; 
      style.flexDirection = "column"; 
    }

    if (position === "tl") { 
      style.bottom = "auto"; 
      style.right = "auto"; 
      style.top = "24px"; 
      style.left = "24px"; 
      style.flexDirection = "column"; 
      style.alignItems = "flex-start"; 
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
  root.style.display = "flex";
  root.style.flexDirection = pos.flexDirection;
  root.style.alignItems = pos.alignItems;
  root.style.gap = "12px";
  root.style.pointerEvents = "none"; // Konteyner boşluğu tıklamayı engellemesin

  //--------------------------------------------------
  // 5) ANA BUTON (LAUNCHER)
  //--------------------------------------------------
  var mainBtn = document.createElement("button");

  mainBtn.innerHTML = "💬";
  mainBtn.style.width = "60px";
  mainBtn.style.height = "60px";
  mainBtn.style.borderRadius = "50%";
  mainBtn.style.border = "none";
  mainBtn.style.cursor = "pointer";
  mainBtn.style.background = "#111827";
  mainBtn.style.color = "#ffffff";
  mainBtn.style.fontSize = "26px";
  mainBtn.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
  mainBtn.style.transition = "transform 0.2s";
  mainBtn.style.pointerEvents = "auto"; // Buton tıklanabilir

  //--------------------------------------------------
  // 6) SOSYAL BUTONLAR (HELPER)
  //--------------------------------------------------
  function createSocialBtn(icon, color, url, title) {
    var btn = document.createElement("a");
    btn.href = url;
    btn.target = "_blank";
    btn.title = title;
    btn.innerHTML = icon;
    btn.style.width = "48px";
    btn.style.height = "48px";
    btn.style.borderRadius = "50%";
    btn.style.border = "none";
    btn.style.cursor = "pointer";
    btn.style.background = color;
    btn.style.color = "#fff";
    btn.style.fontSize = "20px";
    btn.style.display = "flex";
    btn.style.alignItems = "center";
    btn.style.justifyContent = "center";
    btn.style.textDecoration = "none";
    btn.style.boxShadow = "0 4px 10px rgba(0,0,0,0.2)";
    btn.style.opacity = "0";
    btn.style.transform = "scale(0.5)";
    btn.style.transition = "all 0.3s cubic-bezier(0.68, -0.55, 0.27, 1.55)";
    btn.style.pointerEvents = "none"; // Kapalıyken tıklanmasın
    return btn;
  }

  // Sosyal Medya Konteyneri
  var socialContainer = document.createElement("div");
  socialContainer.style.display = "flex";
  socialContainer.style.flexDirection = pos.flexDirection;
  socialContainer.style.gap = "10px";
  socialContainer.style.alignItems = "center";
  socialContainer.style.pointerEvents = "none";

  var socialBtns = [];

  // 1. WhatsApp
  if (config.whatsappNumber) {
    var waUrl = "https://wa.me/" + config.whatsappNumber;
    var waBtn = createSocialBtn("📞", "#25D366", waUrl, "WhatsApp");
    socialContainer.appendChild(waBtn);
    socialBtns.push(waBtn);
  }

  // 2. Messenger
  if (config.messengerUser) {
    var msUrl = "https://m.me/" + config.messengerUser;
    var msBtn = createSocialBtn("⚡", "#0084FF", msUrl, "Messenger");
    socialContainer.appendChild(msBtn);
    socialBtns.push(msBtn);
  }

  // 3. Instagram
  if (config.instagramUser) {
    var igUrl = "https://ig.me/m/" + config.instagramUser;
    var igBtn = createSocialBtn("📸", "#E1306C", igUrl, "Instagram DM");
    socialContainer.appendChild(igBtn);
    socialBtns.push(igBtn);
  }

  //--------------------------------------------------
  // 7) WIDGET PANEL (IFRAME)
  //--------------------------------------------------
  var panel = document.createElement("div");

  panel.style.width = "360px";
  panel.style.height = "550px";
  panel.style.marginBottom = "12px";
  panel.style.borderRadius = "16px";
  panel.style.overflow = "hidden";
  panel.style.boxShadow = "0 20px 40px rgba(0,0,0,0.25)";
  panel.style.display = "none";
  panel.style.background = "#fff";
  panel.style.pointerEvents = "auto";

  var iframe = null;
  var isChatOpen = false;

  function buildIframeUrl() {
    var payload = {
      customerId: config.customerId,
      apiBaseUrl: config.apiBaseUrl,
      language: config.language,
      origin: window.location.origin
    };
    return config.widgetUrl + "?config=" + encodeURIComponent(JSON.stringify(payload));
  }

  //--------------------------------------------------
  // 8) AKSİYONLAR (Açma/Kapama)
  //--------------------------------------------------
  function toggleSocials(show) {
    socialBtns.forEach(function(btn, index) {
      setTimeout(function() {
        if (show) {
          btn.style.opacity = "1";
          btn.style.transform = "scale(1)";
          btn.style.pointerEvents = "auto";
        } else {
          btn.style.opacity = "0";
          btn.style.transform = "scale(0.5)";
          btn.style.pointerEvents = "none";
        }
      }, index * 50);
    });
  }

  function toggleMain() {
    if (isChatOpen) {
      // Sohbeti kapat
      panel.style.display = "none";
      isChatOpen = false;
      mainBtn.innerHTML = "💬";
    } else {
      // Sohbeti aç
      if (!iframe) {
        iframe = document.createElement("iframe");
        iframe.style.width = "100%";
        iframe.style.height = "100%";
        iframe.style.border = "0";
        iframe.src = buildIframeUrl();
        panel.appendChild(iframe);
      }
      panel.style.display = "block";
      isChatOpen = true;
      mainBtn.innerHTML = "✕";
      
      // Sohbet açılınca sosyal menüyü kapat
      toggleSocials(false);
    }
  }

  // Hover Efektleri (Mouse üstüne gelince ikonları aç)
  mainBtn.onmouseenter = function() {
    if (!isChatOpen) toggleSocials(true);
  };
  
  root.onmouseleave = function() {
    if (!isChatOpen) toggleSocials(false);
  };

  mainBtn.onclick = toggleMain;

  //--------------------------------------------------
  // 9) DOM’A EKLE
  //--------------------------------------------------
  root.appendChild(panel);           // En uzak (Sohbet Penceresi)
  root.appendChild(socialContainer); // Orta (Sosyal İkonlar)
  root.appendChild(mainBtn);         // En yakın (Ana Buton)

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      document.body.appendChild(root);
    });
  } else {
    document.body.appendChild(root);
  }

  console.log("[MurekkAPP] Widget loader v2 yüklendi:", config);
})();