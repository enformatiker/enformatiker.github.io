/*
 * HAR Watch site ayarları — domain/host değişince sadece BURASI düzenlenir.
 *
 * Şimdilik GitHub Pages + Cloudflare workers.dev kullanılıyor.
 * Kendi domain/host'unu aldığında:
 *   - apiBase: Worker'ı kendi domainine bağladıysan "https://api.〈domain〉",
 *     Cloudflare aynı origin'de /api/* route'u kurduysan sadece "" (boş) bırak.
 *   - siteName / supportEmail: marka ve iletişim bilgilerini güncelle.
 * Detaylı adımlar: DOMAIN-SETUP.md
 */
window.HAR_SITE_CONFIG = {
  siteName: "HAR Watch",
  apiBase: "https://har-control.enformatiker.workers.dev",
  supportEmail: "enformatiker@gmail.com",
};
