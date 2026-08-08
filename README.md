# miliconfig Pro - پنل مدیریت چندکاربره ورکر Cloudflare

> سیستم پیشرفته مدیریت کاربران فرعی با محدودیت‌های حجمی و زمانی  
> پشتیبانی از پروتکل‌های gRPC, WebSocket, XHTTPS, HTTP/2  
> بهینه‌سازی شده برای اینترنت ایران

## ویژگی‌ها

### 🎯 سیستم چندکاربره (Multi-Tenant)
- **پنل اختصاصی برای هر ادمین**: هر کاربر پس از ثبت‌نام پنل منحصر به فرد خود را دارد
- **ادمین اصلی (Super Admin)**: ایمیل `milad201400@gmail.com` به عنوان super admin تنظیم شده
- **مدیریت کاربران فرعی**: ایجاد، ویرایش و حذف کاربران با محدودیت‌های سفارشی

### 📊 محدودیت‌های کاربران
- **محدودیت حجم کل (GB)**: تعیین سقف مصرف کلی برای هر کاربر
- **محدودیت روزانه (GB)**: تعیین سقف مصرف روزانه با ریست خودکار
- **محدودیت زمانی (روز)**: تعیین مدت اعتبار اشتراک
- **حالت نامحدود**: امکان تنظیم محدودیت‌ها به صورت نامحدود (0)

### 🔐 پروتکل‌های پشتیبانی شده
- **gRPC**: با پشتیبانی از HTTP/2
- **WebSocket (WS)**: پروتکل استاندارد WS
- **XHTTPS**: پروتکل Reality با امنیت بالا
- **HTTP/2 (H2)**: پروتکل H2 برای سرعت بیشتر

### 🇮🇷 بهینه‌سازی برای ایران
- ProxyIPهای بهینه ایرانی و خاورمیانه
- DNS Resolver چینی (dns.alidns.com)
- فعال‌سازی ECH (Encrypted Client Hello)
- لیست سرورهای تست سرعت منطقه‌ای

### 🤖 ربات تلگرام ترکیبی
- ترکیب قابلیت‌های BPB و Edgetunnel
- مدیریت کاربران از طریق تلگرام
- تولید خودکار کانفیگ‌ها
- گزارش مصرف و وضعیت اشتراک

## نصب و راه‌اندازی

### ۱. پایگاه داده (Supabase)

#### اجرای Migration
فایل migration زیر را در Supabase اجرا کنید:
```bash
supabase/migrations/20260730120000_add_multi_tenant_user_management.sql
```

این فایل جداول زیر را ایجاد می‌کند:
- `admin_profiles`: پروفایل ادمین‌ها با سطح دسترسی
- `sub_users`: کاربران فرعی با محدودیت‌ها
- `user_configs`: کانفیگ‌های پروتکل‌های مختلف

#### تنظیم Super Admin
به صورت خودکار ایمیل `milad201400@gmail.com` به عنوان super admin ثبت می‌شود.

### ۲. فرانت‌اند (React + Vite)

```bash
npm install
npm run dev
```

برای بیلد تولید:
```bash
npm run build
```

### ۳. استقرار در Cloudflare Worker

#### تنظیمات Worker
1. وارد پنل Cloudflare شوید
2. به بخش Workers & Pages بروید
3. Worker جدید ایجاد کنید یا موجود را انتخاب کنید
4. در تب Settings > General:
   - **Compatibility flags**: `nodejs_compat` و `http2` را اضافه کنید
   - این برای پشتیبانی از gRPC و HTTP/2 ضروری است

#### آپلود کد Worker
فایل `public/repo/worker-source.js` را به عنوان کد Worker آپلود کنید.

#### متغیرهای محیطی
- `AUTH_TOKEN`: توکن احراز هویت داینامیک (اختیاری)
- `SUPABASE_URL`: آدرس پروژه Supabase
- `SUPABASE_KEY`: کلید API سرویس نقش Supabase

### ۴. دیپلوی خودکار GitHub Pages

با هر push به شاخه `main`، پروژه به صورت خودکار روی GitHub Pages دیپلوی می‌شود.

```bash
git add .
git commit -m "تغییرات جدید"
git push origin main
```

Workflow GitHub Actions به صورت خودکار:
1. وابستگی‌ها را نصب می‌کند
2. پروژه را بیلد می‌کند
3. خروجی را در پوشه `dist` قرار می‌دهد
4. روی GitHub Pages دیپلوی می‌کند

## ساختار پروژه

```
/workspace
├── src/                      # کد فرانت‌اند React
│   ├── pages/
│   │   ├── SubUsers.tsx      # صفحه مدیریت کاربران فرعی
│   │   ├── Dashboard.tsx
│   │   └── ...
│   ├── lib/
│   │   ├── types.ts          # تایپ‌های TypeScript
│   │   ├── hooks/
│   │   │   └── useSubUsers.ts # هوک مدیریت کاربران
│   │   └── ...
│   └── components/
│       └── Layout.tsx        # لی‌اوت اصلی با منو
├── supabase/
│   └── migrations/
│       └── 20260730120000_add_multi_tenant_user_management.sql
├── public/repo/
│   └── worker-source.js      # کد Cloudflare Worker
├── .github/workflows/
│   └── deploy.yml            # Workflow دیپلوی خودکار
└── README.fa.md              # این فایل
```

## استفاده از پنل

### افزودن کاربر فرعی
1. وارد پنل شوید
2. از منوی سمت راست «کاربران فرعی» را انتخاب کنید
3. دکمه «کاربر جدید» را بزنید
4. اطلاعات زیر را وارد کنید:
   - نام کاربری
   - رمز عبور (یا خالی بگذارید تا خودکار تولید شود)
   - محدودیت حجم کل (GB)
   - محدودیت روزانه (GB)
   - محدودیت زمانی (روز)
   - وضعیت فعال/غیرفعال
5. ذخیره کنید

### تولید کانفیگ
به صورت خودکار برای هر کاربر ۴ کانفیگ با پروتکل‌های مختلف تولید می‌شود:
- gRPC
- WebSocket
- XHTTPS
- HTTP/2

### مشاهده مصرف
در جدول کاربران، نوار پیشرفت مصرف حجم را مشاهده می‌کنید:
- سبز: کمتر از ۷۰٪
- نارنجی: ۷۰-۹۰٪
- قرمز: بیش از ۹۰٪

## امنیت

### Row Level Security (RLS)
تمام جداول Supabase دارای RLS هستند:
- هر ادمین فقط کاربران خود را می‌بیند
- Super admin به همه کاربران دسترسی دارد
- سیاست‌های SELECT/INSERT/UPDATE/DELETE به صورت خودکار اعمال می‌شوند

### حذف توکن‌های ثابت
توکن احراز هویت در Worker از حالت hardcode خارج شده و به صورت داینامیک از KV یا Environment Variables خوانده می‌شود.

## مستندات فنی

### جداول پایگاه داده

#### admin_profiles
| ستون | نوع | توضیح |
|------|-----|-------|
| id | uuid | شناسه یکتا (ارجاع به auth.users) |
| email | text | ایمیل ادمین |
| is_super_admin | boolean | سطح دسترسی super admin |
| created_at | timestamptz | تاریخ ایجاد |

#### sub_users
| ستون | نوع | توضیح |
|------|-----|-------|
| id | uuid | شناسه یکتا |
| admin_id | uuid | شناسه ادمین مالک |
| username | text | نام کاربری |
| password | text | رمز عبور |
| uuid | uuid | UUID برای VLESS |
| data_limit_gb | integer | محدودیت حجم کل (0 = نامحدود) |
| daily_limit_gb | integer | محدودیت روزانه (0 = نامحدود) |
| time_limit_days | integer | محدودیت زمانی به روز |
| expiration_date | timestamptz | تاریخ انقضا |
| is_active | boolean | وضعیت فعال بودن |
| usage_gb | real | مصرف فعلی |
| last_reset | timestamptz | آخرین ریست روزانه |

#### user_configs
| ستون | نوع | توضیح |
|------|-----|-------|
| id | uuid | شناسه یکتا |
| user_id | uuid | شناسه کاربر فرعی |
| protocol | text | نوع پروتکل (grpc/ws/xhttps/h2) |
| config_json | jsonb | تنظیمات اختصاصی پروتکل |
| subscription_link | text | لینک سابسکریپشن |
| last_used | timestamptz | آخرین زمان استفاده |

### توابع پایگاه داده

#### calculate_expiration(days)
تاریخ انقضا را بر اساس تعداد روز محاسبه می‌کند.

#### check_user_limits(user_id)
وضعیت محدودیت‌های کاربر را بررسی کرده و موارد زیر را برمی‌گرداند:
- آیا منقضی شده؟
- آیا از حد حجم گذشته؟
- آیا از حد روزانه گذشته؟
- روزهای باقی‌مانده
- حجم باقی‌مانده
- حجم روزانه باقی‌مانده

## عیب‌یابی

### Worker خطای gRPC می‌دهد
مطمئن شوید compatibility flags زیر در تنظیمات Worker فعال باشند:
- `nodejs_compat`
- `http2`

### کاربران نمایش داده نمی‌شوند
- اتصال به Supabase را بررسی کنید
- Migration را اجرا کرده باشید
- RLS policies را چک کنید

### دیپلوی GitHub Pages کار نمی‌کند
- مطمئن شوید GitHub Pages در تنظیمات مخزن فعال است
- Source را روی GitHub Actions تنظیم کنید
- Branch را `main` انتخاب کنید

## لایسنس

MIT

## حمایت

برای سوالات و پشتیبانی به ایمیل `milad201400@gmail.com` پیام دهید.
