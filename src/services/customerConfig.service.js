// /src/services/customerConfig.service.js

/**
 * ŞİMDİLİK: DB YOK
 * YARIN: DB / Redis / API ile birebir değiştirilebilir
 */

const CUSTOMER_CONFIGS = {
  // DEMO / TEST
  "demo-logistic": {
    sector: "logistic",
  },

  "demo-restaurant": {
    sector: "restaurant",
  },

  "demo-realestate": {
    sector: "realestate",
  },

  "demo-clinic": {
    sector: "clinic",
  },

  "demo-market": {
    sector: "market",
  },
};

export function getCustomerConfig(customerId) {
  if (!customerId) return null;
  return CUSTOMER_CONFIGS[customerId] || null;
}
