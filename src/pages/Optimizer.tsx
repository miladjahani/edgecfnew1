import { useState } from 'react'
import { optimizeNodeUri, buildXrayProfileJson, parseRawInput, fetchSubscriptionContent, type OptimizerOptions } from '../lib/optimizer'
import { Wand2, Copy, Download, FileJson, FileType, Settings2, Check, AlertCircle, Link } from 'lucide-react'

export default function Optimizer() {
  const [input, setInput] = useState('')
  const [cleanIp, setCleanIp] = useState('')
  const [fingerprint, setFingerprint] = useState('chrome')
  const [enableFragment, setEnableFragment] = useState(true)
  const [enableCipherSuites, setEnableCipherSuites] = useState(true)
  const [optimizedText, setOptimizedText] = useState('')
  const [optimizedJson, setOptimizedJson] = useState('')
  const [activeTab, setActiveTab] = useState<'text' | 'json'>('text')
  const [copied, setCopied] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleOptimize = async () => {
    if (!input.trim()) return
    
    setIsLoading(true)
    setError('')
    
    try {
      let rawContent = input.trim()
      
      // اگر ورودی یک لینک اشتراک است، محتوا را دریافت کن
      if (rawContent.startsWith('http://') || rawContent.startsWith('https://')) {
        rawContent = await fetchSubscriptionContent(rawContent)
      }
      
      const configs = parseRawInput(rawContent)
      if (configs.length === 0) {
        setError('هیچ کانفیگی یافت نشد.')
        setIsLoading(false)
        return
      }

      const options: OptimizerOptions = {
        cleanIp: cleanIp || undefined,
        fingerprint: fingerprint || undefined,
        enableFragment,
        enableCipherSuites,
      }

      // خروجی تکست
      const optimizedUris = configs.map(uri => optimizeNodeUri(uri, options))
      setOptimizedText(optimizedUris.join('\n'))

      // خروجی جیسون
      const jsonConfig = buildXrayProfileJson(configs, options)
      setOptimizedJson(JSON.stringify(jsonConfig, null, 2))
    } catch (err: any) {
      setError(err.message || 'خطا در بهینه‌سازی کانفیگ‌ها')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopy = async () => {
    const content = activeTab === 'text' ? optimizedText : optimizedJson
    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    const content = activeTab === 'text' ? optimizedText : optimizedJson
    const filename = activeTab === 'text' ? 'optimized-configs.txt' : 'xray-profile.json'
    const blob = new Blob([content], { type: activeTab === 'text' ? 'text/plain' : 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const configCount = parseRawInput(input).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">بهینه‌ساز کانفیگ</h1>
        <p className="text-slate-400 text-sm mt-1">لینک‌های VLESS/Trojan را وارد کرده و کانفیگ‌های بهینه شده دریافت کنید</p>
      </div>

      {/* Input Section */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <label className="text-white font-medium flex items-center gap-2">
            {input.trim().startsWith('http://') || input.trim().startsWith('https://') ? (
              <Link className="w-5 h-5 text-brand-400" />
            ) : (
              <FileType className="w-5 h-5 text-brand-400" />
            )}
            {input.trim().startsWith('http://') || input.trim().startsWith('https://') ? 'لینک اشتراک' : 'ورودی کانفیگ‌ها'}
          </label>
          {configCount > 0 && !input.trim().startsWith('http') && (
            <span className="text-xs text-brand-400 bg-brand-500/10 px-3 py-1 rounded-full border border-brand-500/30">
              {configCount} کانفیگ شناسایی شد
            </span>
          )}
        </div>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            input.trim().startsWith('http://') || input.trim().startsWith('https://')
              ? 'لینک اشتراک خود را اینجا وارد کنید (مثلاً: https://example.com/sub)'
              : 'لینک‌های vless:// یا trojan:// را اینجا وارد کنید (هر لینک در یک خط) یا لینک اشتراک بدهید'
          }
          className="w-full h-48 bg-slate-900/50 border border-slate-700 rounded-xl p-4 text-white text-sm font-mono resize-none focus:outline-none focus:border-brand-500 transition-colors"
          dir="ltr"
        />
      </div>

      {/* Options Section */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Settings2 className="w-5 h-5 text-brand-400" />
          <h2 className="text-white font-medium">تنظیمات بهینه‌سازی</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Clean IP */}
          <div>
            <label className="block text-sm text-slate-400 mb-2">Clean IP (اختیاری)</label>
            <input
              type="text"
              value={cleanIp}
              onChange={(e) => setCleanIp(e.target.value)}
              placeholder="مثلاً: 8.8.8.8 یا 1.2.3.4:443"
              className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-brand-500 transition-colors"
              dir="ltr"
            />
          </div>

          {/* Fingerprint */}
          <div>
            <label className="block text-sm text-slate-400 mb-2">Fingerprint</label>
            <select
              value={fingerprint}
              onChange={(e) => setFingerprint(e.target.value)}
              className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-brand-500 transition-colors"
            >
              <option value="chrome">Chrome</option>
              <option value="firefox">Firefox</option>
              <option value="safari">Safari</option>
              <option value="ios">iOS</option>
              <option value="android">Android</option>
              <option value="edge">Edge</option>
              <option value="random">Random</option>
            </select>
          </div>

          {/* Toggles */}
          <div className="flex flex-col gap-3">
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className={`w-12 h-6 rounded-full transition-colors ${enableFragment ? 'bg-brand-500' : 'bg-slate-700'} relative`}>
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${enableFragment ? 'left-7' : 'left-1'}`} />
              </div>
              <span className="text-sm text-slate-300 group-hover:text-white transition-colors">Fragment</span>
              <input type="checkbox" checked={enableFragment} onChange={() => setEnableFragment(!enableFragment)} className="hidden" />
            </label>

            <label className="flex items-center gap-3 cursor-pointer group">
              <div className={`w-12 h-6 rounded-full transition-colors ${enableCipherSuites ? 'bg-brand-500' : 'bg-slate-700'} relative`}>
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${enableCipherSuites ? 'left-7' : 'left-1'}`} />
              </div>
              <span className="text-sm text-slate-300 group-hover:text-white transition-colors">Cipher Suites</span>
              <input type="checkbox" checked={enableCipherSuites} onChange={() => setEnableCipherSuites(!enableCipherSuites)} className="hidden" />
            </label>
          </div>
        </div>

        {/* Optimize Button */}
        <button
          onClick={handleOptimize}
          disabled={!input.trim() || isLoading}
          className="w-full mt-6 btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              در حال دریافت و بهینه‌سازی...
            </>
          ) : (
            <>
              <Wand2 className="w-5 h-5" />
              بهینه‌سازی کانفیگ‌ها
            </>
          )}
        </button>

        {/* Error Message */}
        {error && (
          <div className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}
      </div>

      {/* Output Section */}
      {(optimizedText || optimizedJson) && (
        <div className="glass-card p-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            {/* Tabs */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('text')}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  activeTab === 'text'
                    ? 'bg-brand-500 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                خروجی Text
              </button>
              <button
                onClick={() => setActiveTab('json')}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  activeTab === 'json'
                    ? 'bg-brand-500 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <FileJson className="w-4 h-4 inline-block mr-1" />
                خروجی JSON
              </button>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-all text-sm"
              >
                {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                {copied ? 'کپی شد' : 'کپی'}
              </button>
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-all text-sm"
              >
                <Download className="w-4 h-4" />
                دانلود
              </button>
            </div>
          </div>

          {/* Output Content */}
          <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-4 max-h-96 overflow-auto">
            {activeTab === 'text' ? (
              <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap break-all" dir="ltr">
                {optimizedText}
              </pre>
            ) : (
              <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap break-all" dir="ltr">
                {optimizedJson}
              </pre>
            )}
          </div>

          {/* Info */}
          <div className="flex items-start gap-2 mt-4 p-3 rounded-xl bg-blue-500/10 border border-blue-500/30">
            <AlertCircle className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-300">
              خروجی Text شامل لینک‌های بهینه شده است. خروجی JSON یک پروفایل کامل Xray با تمام Outboundها می‌باشد که می‌توانید مستقیماً در کلاینت‌ها استفاده کنید.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
