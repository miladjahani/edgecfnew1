import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { Cloud, Link, Smartphone, AlertTriangle, CheckCircle, Loader2, ExternalLink } from 'lucide-react'

export default function GRoute() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [subUrl, setSubUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  
  // بررسی پارامتر sub در URL
  useEffect(() => {
    const subParam = searchParams.get('sub')
    if (subParam) {
      setSubUrl(decodeURIComponent(subParam))
    }
  }, [searchParams])

  const handleOpenInGRoute = () => {
    if (!subUrl.trim()) {
      setMessage({ type: 'error', text: 'لطفاً لینک ساب‌سکریپشن را وارد کنید' })
      return
    }

    setLoading(true)
    
    // ساخت Deep Link برای GRoute
    // توجه: GRoute باید از intent filter برای vless:// vmess:// trojan:// ss:// پشتیبانی کند
    const encodedUrl = encodeURIComponent(subUrl.trim())
    
    // روش 1: تلاش برای باز کردن با custom scheme
    const grouteUrl = `groute://import?url=${encodedUrl}`
    
    // روش 2: استفاده از Intent Android
    const intentUrl = `intent://import#${encodeURIComponent(`url=${encodedUrl}`)};scheme=groute;package=net.gozar.app;S.browser_fallback_url=${encodeURIComponent(window.location.origin + '/groute?sub=' + encodedUrl)};end`
    
    try {
      // تلاش برای باز کردن اپلیکیشن
      window.location.href = intentUrl
      
      setMessage({ 
        type: 'success', 
        text: 'در حال انتقال به اپلیکیشن GRoute...' 
      })
      
      setTimeout(() => {
        setLoading(false)
      }, 2000)
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: 'اپلیکیشن GRoute نصب نیست. لطفاً آن را از GitHub دانلود و نصب کنید.' 
      })
      setLoading(false)
    }
  }

  const handleCopyLink = async () => {
    if (!subUrl.trim()) {
      setMessage({ type: 'error', text: 'لطفاً لینک ساب‌سکریپشن را وارد کنید' })
      return
    }

    const shareUrl = `${window.location.origin}/groute?sub=${encodeURIComponent(subUrl.trim())}`
    
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'اتصال به GRoute',
          text: 'لینک ساب‌سکریپشن خود را برای اتصال به GRoute به اشتراک بگذارید',
          url: shareUrl
        })
      } else {
        await navigator.clipboard.writeText(shareUrl)
        setMessage({ type: 'success', text: 'لینک کپی شد! حالا می‌توانید آن را در گوشی باز کنید' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'خطا در کپی لینک' })
    }
  }

  const downloadGRoute = () => {
    window.open('https://github.com/SuOracle/GRoute/releases', '_blank')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Cloud className="w-7 h-7 text-brand-400" />
            GRoute - تونل VPN
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            اتصال مستقیم به اپلیکیشن GRoute با لینک ساب‌سکریپشن
          </p>
        </div>
      </div>

      {/* Info Box */}
      <div className="glass-card p-6 border-l-4 border-l-brand-500">
        <div className="flex items-start gap-4">
          <Smartphone className="w-6 h-6 text-brand-400 shrink-0 mt-1" />
          <div className="flex-1">
            <h3 className="text-white font-bold mb-2">نحوه کارکرد</h3>
            <ol className="text-slate-300 text-sm space-y-2 list-decimal list-inside">
              <li>اپلیکیشن GRoute را از <a href="https://github.com/SuOracle/GRoute/releases" target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:text-brand-300 underline">GitHub Releases</a> دانلود و نصب کنید</li>
              <li>لینک ساب‌سکریپشن خود را در فیلد زیر وارد کنید</li>
              <li>روی دکمه "باز کردن در GRoute" کلیک کنید</li>
              <li>اپلیکیشن به صورت خودکار باز شده و کانفیگ را وارد می‌کند</li>
              <li>در اپلیکیشن GRoute، به سرور متصل شوید تا کل ترافیک گوشی از تونل عبور کند</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Warning Box */}
      <div className="glass-card p-6 border-l-4 border-l-orange-500 bg-orange-500/5">
        <div className="flex items-start gap-4">
          <AlertTriangle className="w-6 h-6 text-orange-400 shrink-0 mt-1" />
          <div className="flex-1">
            <h3 className="text-white font-bold mb-2">توجه مهم</h3>
            <p className="text-slate-300 text-sm">
              GRoute یک اپلیکیشن اندروید است و نمی‌تواند مستقیماً در مرورگر وب اجرا شود. 
              برای استفاده از قابلیت تونل VPN، باید اپلیکیشن را روی دستگاه اندرویدی خود نصب کنید.
              این صفحه فقط لینک ساب‌سکریپشن شما را به اپلیکیشن منتقل می‌کند.
            </p>
          </div>
        </div>
      </div>

      {/* Main Card */}
      <div className="glass-card p-8 max-w-2xl mx-auto">
        <div className="space-y-6">
          {/* Input Field */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              لینک ساب‌سکریپشن
            </label>
            <div className="relative">
              <Link className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="url"
                value={subUrl}
                onChange={(e) => setSubUrl(e.target.value)}
                placeholder="https://example.com/sub/xxxxx"
                className="w-full pr-12 pl-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
                dir="ltr"
              />
            </div>
          </div>

          {/* Message */}
          {message && (
            <div className={`p-4 rounded-xl flex items-center gap-3 ${
              message.type === 'success' 
                ? 'bg-green-500/10 border border-green-500/30 text-green-400' 
                : 'bg-red-500/10 border border-red-500/30 text-red-400'
            }`}>
              {message.type === 'success' ? (
                <CheckCircle className="w-5 h-5 shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 shrink-0" />
              )}
              <span className="text-sm">{message.text}</span>
            </div>
          )}

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleOpenInGRoute}
              disabled={loading}
              className="btn-primary flex items-center justify-center gap-2 flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <ExternalLink className="w-5 h-5" />
              )}
              {loading ? 'در حال انتقال...' : 'باز کردن در GRoute'}
            </button>

            <button
              onClick={handleCopyLink}
              className="btn-ghost flex items-center justify-center gap-2 flex-1"
            >
              <Link className="w-5 h-5" />
              کپی لینک
            </button>
          </div>

          {/* Download Button */}
          <button
            onClick={downloadGRoute}
            className="w-full py-3 px-4 rounded-xl bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 hover:text-white transition-all duration-200 flex items-center justify-center gap-2 text-sm font-medium"
          >
            <Smartphone className="w-5 h-5" />
            دانلود اپلیکیشن GRoute از GitHub
          </button>
        </div>
      </div>

      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card p-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mb-4">
            <Cloud className="w-6 h-6 text-white" />
          </div>
          <h3 className="text-white font-bold mb-2">تونل کامل</h3>
          <p className="text-slate-400 text-sm">
            تمام ترافیک گوشی از طریق VPN عبور می‌کند
          </p>
        </div>

        <div className="glass-card p-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center mb-4">
            <CheckCircle className="w-6 h-6 text-white" />
          </div>
          <h3 className="text-white font-bold mb-2">پروتکل‌های متنوع</h3>
          <p className="text-slate-400 text-sm">
            پشتیبانی از VLESS، VMess، Trojan و Shadowsocks
          </p>
        </div>

        <div className="glass-card p-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center mb-4">
            <Link className="w-6 h-6 text-white" />
          </div>
          <h3 className="text-white font-bold mb-2">مسیریابی هوشمند</h3>
          <p className="text-slate-400 text-sm">
            مسیریابی تفکیکی برای ترافیک ایران و خارج
          </p>
        </div>
      </div>
    </div>
  )
}
