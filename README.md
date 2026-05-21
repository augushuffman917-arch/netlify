# راه‌اندازی معماری دو-پروژه‌ای Netlify (Project-1 → Project-2 → External Server)

این ریپو یک الگوی آماده برای پراکسی چندمرحله‌ای روی Netlify ارائه می‌دهد:

1. **Project-1 (ساده / عمومی)**
   - یک سایت ساده HTML را سرو می‌کند.
   - درخواست‌ها را به Project-2 فوروارد می‌کند.
2. **Project-2 (Relay پیشرفته)**
   - همان Edge Function را اجرا می‌کند اما در حالت مرحله دوم.
   - ترافیک را به سرور خارجی (Origin) می‌فرستد.

---

## ساختار فایل‌ها

- `netlify/edge-functions/relay.js`: منطق Edge Proxy برای هر دو حالت first/second.
- `netlify.toml`: تنظیمات Build و Edge Function.
- `scripts/verify-build.sh`: اسکریپت اعتبارسنجی Build.
- `public/index.html`: سایت HTML که باید روی Netlify ران شود.

---

## پیش‌نیازها

- حساب Netlify
- دسترسی به GitHub/GitLab/Bitbucket (یا Netlify CLI)
- یک دامنه/Origin خارجی که Project-2 باید به آن پراکسی کند

---

## منطق Route در این پروژه

Edge Function با متغیر زیر کنترل می‌شود:

- `PROXY_MODE=first`: پروژه در نقش مرحله اول کار می‌کند (ارسال به Project-2)
- `PROXY_MODE=second`: پروژه در نقش مرحله دوم کار می‌کند (ارسال به Origin خارجی)
- `PROXY_MODE=auto`: تشخیص خودکار (برای سناریوهای ترکیبی)

Upstreamها:

- برای **first** از `NEXT_PROJECT_URL`
- برای **second** از `TARGET_ORIGIN`

---

## مرحله 1: ساخت Project-2 (Relay به سرور خارجی)

> پیشنهاد: اول Project-2 را بسازید تا URL آن را در Project-1 قرار دهید.

1. در Netlify گزینه **Add new site** را بزنید.
2. همین ریپو را Deploy کنید.
3. در Site settings → Environment variables مقدارها را تنظیم کنید:
   - `PROXY_MODE=second`
   - `TARGET_ORIGIN=https://YOUR-EXTERNAL-ORIGIN.com`
4. Deploy مجدد بزنید (یا Trigger deploy).
5. آدرس سایت Project-2 را بردارید (مثلاً `https://my-relay-2.netlify.app`).

---

## مرحله 2: ساخت Project-1 (سایت ساده + فوروارد به Project-2)

1. یک Site جدید دیگر در Netlify از **همین ریپو** بسازید.
2. Environment variables:
   - `PROXY_MODE=first`
   - `NEXT_PROJECT_URL=https://YOUR-PROJECT-2.netlify.app`
3. Deploy کنید.
4. این پروژه همان سایت HTML را سرو می‌کند و ترافیک را به Project-2 می‌فرستد.

---

## مرحله 3: اتصال نهایی

پس از تنظیم هر دو پروژه:

- کاربر به **Project-1** می‌رسد.
- Project-1 درخواست را به **Project-2** می‌فرستد.
- Project-2 درخواست را به **External Origin** می‌فرستد.

مسیر نهایی:

`Client → Project-1 (Netlify) → Project-2 (Netlify) → External Origin`

---

## رفتار صفحه HTML

- فایل `public/index.html` سایت اصلی است و توسط Netlify Publish می‌شود.
- اگر مسیر `/` فراخوانی شود و upstream تنظیم نشده باشد، Edge Function صفحه fallback را برمی‌گرداند.
- Build script هم بررسی می‌کند که `public/index.html` واقعا HTML باشد.

---

## Build و تست محلی

برای بررسی سریع قبل از Deploy:

```bash
bash ./scripts/verify-build.sh
```

اگر خروجی موفق باشد، حداقل شرایط لازم برای انتشار برقرار است.

---

## نکات دیباگ

### 1) بررسی نقش هر پروژه
در پاسخ هدر زیر ست می‌شود:

- `x-netlify-proxy-mode: first` یا `second`

با این هدر می‌توانید بفهمید پاسخ از کدام مرحله آمده است.

### 2) خطای 400 (missing upstream)
اگر این خطا را دیدید:

- در Project-1 باید `NEXT_PROJECT_URL` تنظیم باشد.
- در Project-2 باید `TARGET_ORIGIN` تنظیم باشد.

### 3) حلقه ریدایرکت یا مسیر اشتباه
- مطمئن شوید `NEXT_PROJECT_URL` به Project-2 اشاره می‌کند (نه Project-1).
- مطمئن شوید `TARGET_ORIGIN` به سرور خارجی واقعی اشاره می‌کند.

---

## پیشنهاد برای Production

- برای هر پروژه دامنه جدا بگذارید (مثلاً `edge1.example.com` و `edge2.example.com`).
- TLS/HTTPS را اجباری نگه دارید.
- روی Origin خارجی Rate-limit و Access policy اعمال کنید.
- در صورت نیاز لاگ‌گیری بیشتر به Edge Function اضافه کنید.

---

## خلاصه تنظیم متغیرها

### Project-1
- `PROXY_MODE=first`
- `NEXT_PROJECT_URL=https://<project-2-domain>`

### Project-2
- `PROXY_MODE=second`
- `TARGET_ORIGIN=https://<external-origin>`

---

اگر خواستید، در مرحله بعد می‌تونم یک چک‌لیست Deploy هم اضافه کنم (قبل و بعد از Go-Live) که سریع تست کنید همه‌چیز سالمه.
