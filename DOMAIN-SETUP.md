# HAR Watch — domain / host geçiş rehberi

Amaç: bugün `enformatiker.github.io/har.html` üzerinde çalışan paneli, ileride **kendi
domainin + hostun** ile gerçek bir ürün sitesine dönüştüğünde **site kodunu değiştirmeden**
taşımak. Tüm adres/marka ayarları tek dosyada: [`site.config.js`](site.config.js).

## 1) Şu anki durum

| Parça | Yer | Not |
|---|---|---|
| Site (statik) | GitHub Pages: `enformatiker.github.io/har.html` | Form, marka ve liste burada |
| Ayar dosyası | `site.config.js` | `apiBase`, `siteName`, `supportEmail` |
| API köprüsü | Cloudflare Worker (henüz deploy edilmedi) | `har-rental-watcher/worker/index.js` |
| Otomasyonlar | `har-watch` repo → `automations.json` | Worker buraya yazar |
| Cron / mail | `har-watch-config.yml` → `har_watch.py` | 6 saatte bir + ilk kurulumda hemen |

## 2) Worker'ı deploy et (bir kez)

### 2.1 GitHub token

GitHub → Settings → Developer settings → Personal access tokens → **Fine-grained tokens**:

- Repository access: **Only select repositories** → `enformatiker/har-watch`
- Permissions: **Contents: Read & write**, **Actions: Read & write**
- Token'ı kopyala (bir daha gösterilmez).

> Bu token sadece Worker'da saklanır; tarayıcıya/site dosyalarına asla yazılmaz.

### 2.2 Cloudflare Worker oluştur

**Yol A — Dashboard (Node gerektirmez, önerilen):**

1. Cloudflare dashboard → **Workers & Pages → Create → Worker → Quick edit**.
2. `har-rental-watcher/worker/index.js` dosyasının tüm içeriğini editöre yapıştır, **Deploy**.
3. Worker → **Settings → Variables and Secrets** → Add:
   - `GITHUB_TOKEN` = (2.1'deki token) → **Secret**
   - `ACCESS_CODE` = demo kodu (örn. `HARDEMO`) → **Secret** (opsiyonel)
   - `ALLOWED_ORIGIN` = site adresi (örn. `https://enformatiker.github.io`) → **Secret** (opsiyonel; kendi domaine geçince mutlaka ekle)
4. Çıkan adresi kopyala: `https://har-control.〈subdomain〉.workers.dev`.

**Yol B — Wrangler CLI (Node kuruluysa):**

```bash
cd har-rental-watcher/worker
npx wrangler login
npx wrangler secret put GITHUB_TOKEN
npx wrangler secret put ACCESS_CODE
npx wrangler deploy
```

### 2.3 Adresi siteye bağla

`site.config.js` içinde:

```js
apiBase: "https://har-control.〈subdomain〉.workers.dev",
```

değişip push et. (Geçici test için adresi `?worker=https://...` ile veya paneldeki
**Gelişmiş: API adresi** kutusuyla da verebilirsin; tarayıcıya kaydedilir.)

Doğrulama:

```bash
curl https://har-control.〈subdomain〉.workers.dev/health
# {"ok":true,"service":"har-control"}
```

Sonra `har.html` üzerinden bir ZIP/mod gönder; birkaç saniye içinde aynı formatta mail gelir.

## 3) Domain/host alındığında (3 seçenek)

Hiçbiri `har.html` dosyasının gövdesini değiştirmez — sadece `site.config.js` güncellenir.

### A) Cloudflare Pages + aynı origin (en temiz ürün kurulumu)

- Statik dosyaları Cloudflare Pages'e bağla (repo: `enformatiker-github-io`).
- Worker'a **route** ekle: `har.〈domain〉/api/*` → Worker.
- `site.config.js`: `apiBase: ""` (boş = aynı origin), `siteName` ve `supportEmail` yeni marka.
- Worker secret: `ALLOWED_ORIGIN = https://har.〈domain〉`.
- Avantaj: CORS sorunu yok, tek domain, tek SSL, istersen Cloudflare Access ile koruma.

### B) GitHub Pages + ayrı API domaini

- Repo köküne `CNAME` dosyası ekle (şablon: `CNAME.example`) → `har.〈domain〉`.
- GitHub repo → Settings → Pages → Custom domain → aynı adres, `Enforce HTTPS` açık.
- DNS: `har` → CNAME `enformatiker.github.io` (apex kullanacaksan A kayıtları GitHub IP'leri).
- Worker → Settings → Domains & Routes → Custom domain → `api.〈domain〉`.
- `site.config.js`: `apiBase: "https://api.〈domain〉"`, `ALLOWED_ORIGIN = https://har.〈domain〉`.

### C) Netlify / Vercel / başka bir host

- Statik klasörü olduğu gibi deploy et (build komutu yok).
- `apiBase` yine `https://api.〈domain〉` (Worker ayrı durur) veya hostun reverse-proxy'si
  varsa `""` (aynı origin).
- `site.config.js` derleme sırasında ortam değişkeninden üretilebilir; API sözleşmesi
  (`/api/automations`) aynı kaldığı için form kodu değişmez.

## 4) Ürünleşirken değişecek yerler (site kodu sabit kalır)

| Bugün (demo) | Ürün sürümü |
|---|---|
| `automations.json` (repo dosyası) | Supabase / Neon: `automations(user_id, zip, mode, email, active)` |
| `ACCESS_CODE` | Supabase Auth / Clerk + kullanıcı bazlı API anahtarı |
| GitHub Actions cron | Cloudflare Cron Trigger + Queues (veya Fly.io worker) |
| Gmail SMTP | Resend / Postmark (doğrulanmış alan adı) |
| Actions state commit | Postgres/KV'de son ilan hash'i |
| Statik form | Dashboard + Stripe ödeme + kullanım kotası |

Formun gönderdiği alanlar (`zip`, `mode`, `email`) ve yanıt biçimi (`ok`, `message`,
`dispatched`) korunur; Worker içindeki `readConfig()` / PUT / dispatch çağrıları DB
yazmasıyla değiştirilir. Böylece kullanıcı arayüzüne dokunmak gerekmez.

## 5) Güvenlik notları

- Token'ı asla repoya veya `site.config.js` içine yazma; Worker secret'i olarak tut.
- Kendi domaine geçince `ALLOWED_ORIGIN`'i **mutlaka** ayarla ve demo `ACCESS_CODE`'u değiştir.
- Başka birine token verdiysen hemen iptal edip yenisini üret.
