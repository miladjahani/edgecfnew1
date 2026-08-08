import { useState } from 'react'
import { Plus, Edit, Trash2, Copy, Check, User, Key, Database, Clock, Calendar, Activity, WifiOff, Server } from 'lucide-react'
import { useSubUsers } from '../lib/hooks/useSubUsers'
import type { SubUser, UserConfig } from '../lib/types'

export default function SubUsers() {
  const { users, loading, error, addUser, updateUser, deleteUser, createUserConfig, getUserConfigs, refresh } = useSubUsers()
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState<SubUser | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    data_limit_gb: 0,
    time_limit_days: 0,
    daily_limit_gb: 0,
    is_active: true,
  })

  const resetForm = () => {
    setFormData({
      username: '',
      password: '',
      data_limit_gb: 0,
      time_limit_days: 0,
      daily_limit_gb: 0,
      is_active: true,
    })
    setEditingUser(null)
    setShowModal(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const uuid = crypto.randomUUID()
      
      if (editingUser) {
        await updateUser(editingUser.id, {
          username: formData.username,
          password: formData.password || editingUser.password,
          data_limit_gb: formData.data_limit_gb,
          time_limit_days: formData.time_limit_days,
          daily_limit_gb: formData.daily_limit_gb,
          is_active: formData.is_active,
          expiration_date: formData.time_limit_days > 0 
            ? new Date(Date.now() + formData.time_limit_days * 24 * 60 * 60 * 1000).toISOString()
            : null,
        })
      } else {
        await addUser({
          admin_id: '', // Will be set by RLS to auth.uid()
          username: formData.username,
          password: formData.password || Array.from({ length: 16 }, () => Math.random().toString(36)[2]).join(''),
          uuid,
          data_limit_gb: formData.data_limit_gb,
          time_limit_days: formData.time_limit_days,
          daily_limit_gb: formData.daily_limit_gb,
          expiration_date: formData.time_limit_days > 0
            ? new Date(Date.now() + formData.time_limit_days * 24 * 60 * 60 * 1000).toISOString()
            : null,
          is_active: formData.is_active,
        })
        
        // Create default configs for all protocols
        const protocols: Array<'grpc' | 'ws' | 'xhttps' | 'h2'> = ['grpc', 'ws', 'xhttps', 'h2']
        for (const protocol of protocols) {
          await createUserConfig({
            user_id: '', // Will be set after user creation
            protocol,
            config_json: {
              uuid,
              password: formData.password,
              protocol,
            },
            subscription_link: null,
          })
        }
      }
      resetForm()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'خطا در ذخیره کاربر')
    }
  }

  const handleEdit = (user: SubUser) => {
    setEditingUser(user)
    setFormData({
      username: user.username,
      password: user.password,
      data_limit_gb: user.data_limit_gb,
      time_limit_days: user.time_limit_days,
      daily_limit_gb: user.daily_limit_gb,
      is_active: user.is_active,
    })
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('آیا از حذف این کاربر مطمئن هستید؟')) return
    try {
      await deleteUser(id)
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'خطا در حذف کاربر')
    }
  }

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const generateVlessConfig = (user: SubUser, protocol: string, domain: string) => {
    const configs: Record<string, string> = {}
    
    if (protocol === 'grpc') {
      configs.grpc = `vless://${user.uuid}@${domain}:443?encryption=none&security=tls&fp=chrome&pbk=your_public_key&sid=your_short_id&type=grpc&serviceName=grpc-${user.username}&path=%2F#miliconfig-${user.username}`
    } else if (protocol === 'ws') {
      configs.ws = `vless://${user.uuid}@${domain}:443?encryption=none&security=tls&fp=chrome&type=ws&host=${domain}&path=%2F${user.username}#miliconfig-${user.username}`
    } else if (protocol === 'xhttps') {
      configs.xhttps = `vless://${user.uuid}@${domain}:443?encryption=none&security=reality&fp=chrome&pbk=your_public_key&sid=your_short_id&type=http&host=${domain}&path=%2F${user.username}#miliconfig-${user.username}`
    }
    
    return configs
  }

  const getStatusColor = (user: SubUser) => {
    if (!user.is_active) return 'bg-red-500/20 text-red-400 border-red-500/30'
    if (user.expiration_date && new Date(user.expiration_date) < new Date()) return 'bg-orange-500/20 text-orange-400 border-orange-500/30'
    if (user.data_limit_gb > 0 && user.usage_gb >= user.data_limit_gb) return 'bg-red-500/20 text-red-400 border-red-500/30'
    return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
  }

  const getUsagePercent = (user: SubUser) => {
    if (user.data_limit_gb <= 0) return 0
    return Math.min(100, (user.usage_gb / user.data_limit_gb) * 100)
  }

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="animate-pulse text-brand-400 text-lg">در حال بارگذاری...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 rounded-xl bg-error-500/10 border border-error-500/30 text-error-400">
        {error}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">کاربران فرعی</h1>
          <p className="text-slate-400 text-sm">مدیریت کاربران با محدودیت‌های حجمی و زمانی</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-brand-700 text-white font-medium hover:from-brand-500 hover:to-brand-600 transition-all duration-200 shadow-lg shadow-brand-500/25"
        >
          <Plus className="w-4 h-4" />
          کاربر جدید
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/50">
          <div className="flex items-center gap-3 mb-2">
            <User className="w-5 h-5 text-brand-400" />
            <span className="text-slate-400 text-sm">کل کاربران</span>
          </div>
          <p className="text-2xl font-bold text-white">{users.length}</p>
        </div>
        <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/50">
          <div className="flex items-center gap-3 mb-2">
            <Activity className="w-5 h-5 text-emerald-400" />
            <span className="text-slate-400 text-sm">فعال</span>
          </div>
          <p className="text-2xl font-bold text-white">{users.filter(u => u.is_active).length}</p>
        </div>
        <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/50">
          <div className="flex items-center gap-3 mb-2">
            <Database className="w-5 h-5 text-blue-400" />
            <span className="text-slate-400 text-sm">مصرف کل (GB)</span>
          </div>
          <p className="text-2xl font-bold text-white">{users.reduce((sum, u) => sum + u.usage_gb, 0).toFixed(1)}</p>
        </div>
        <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/50">
          <div className="flex items-center gap-3 mb-2">
            <WifiOff className="w-5 h-5 text-red-400" />
            <span className="text-slate-400 text-sm">منقضی/غیرفعال</span>
          </div>
          <p className="text-2xl font-bold text-white">{users.filter(u => !u.is_active || (u.expiration_date && new Date(u.expiration_date) < new Date())).length}</p>
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-xl bg-slate-900/50 border border-slate-800/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-800/30 border-b border-slate-800/50">
              <tr>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-400">نام کاربری</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-400">UUID</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-400">محدودیت‌ها</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-400">مصرف</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-400">وضعیت</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-400">انقضا</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-400">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/30">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-slate-800/20 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white font-bold text-xs">
                        {user.username[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="text-white font-medium text-sm">{user.username}</p>
                        <p className="text-slate-500 text-xs truncate max-w-[150px]">{user.password}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <code className="text-xs text-slate-400 bg-slate-800/50 px-2 py-1 rounded truncate max-w-[200px]">
                        {user.uuid.slice(0, 8)}...
                      </code>
                      <button
                        onClick={() => copyToClipboard(user.uuid, user.id)}
                        className="p-1.5 rounded-lg hover:bg-slate-800/50 text-slate-400 hover:text-white transition-colors"
                      >
                        {copiedId === user.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="space-y-1 text-xs">
                      {user.data_limit_gb > 0 ? (
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <Database className="w-3.5 h-3.5" />
                          <span>{user.data_limit_gb} GB کل</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-emerald-400">
                          <Database className="w-3.5 h-3.5" />
                          <span>نامحدود</span>
                        </div>
                      )}
                      {user.daily_limit_gb > 0 ? (
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{user.daily_limit_gb} GB روزانه</span>
                        </div>
                      ) : null}
                      {user.time_limit_days > 0 ? (
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{user.time_limit_days} روز</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-emerald-400">
                          <Clock className="w-3.5 h-3.5" />
                          <span>نامحدود</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-slate-400 w-12">{user.usage_gb.toFixed(1)} GB</span>
                        <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              getUsagePercent(user) > 90 ? 'bg-red-500' :
                              getUsagePercent(user) > 70 ? 'bg-orange-500' :
                              'bg-emerald-500'
                            }`}
                            style={{ width: `${getUsagePercent(user)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium border ${getStatusColor(user)}`}>
                      {!user.is_active ? 'غیرفعال' :
                       user.expiration_date && new Date(user.expiration_date) < new Date() ? 'منقضی' :
                       user.data_limit_gb > 0 && user.usage_gb >= user.data_limit_gb ? 'اتمام حجم' :
                       'فعال'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {user.expiration_date ? (
                      <div className="text-xs text-slate-400">
                        {new Date(user.expiration_date).toLocaleDateString('fa-IR')}
                      </div>
                    ) : (
                      <span className="text-xs text-emerald-400">نامحدود</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => handleEdit(user)}
                        className="p-1.5 rounded-lg hover:bg-brand-500/10 text-slate-400 hover:text-brand-400 transition-colors"
                        title="ویرایش"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(user.id)}
                        className="p-1.5 rounded-lg hover:bg-error-500/10 text-slate-400 hover:text-error-400 transition-colors"
                        title="حذف"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {users.length === 0 && (
          <div className="p-8 text-center text-slate-400">
            <Server className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>هیچ کاربری یافت نشد</p>
            <p className="text-sm mt-1">برای افزودن کاربر جدید کلیک کنید</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => resetForm()}>
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl" onClick={e => e.stopPropagation()}>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <h2 className="text-xl font-bold text-white mb-4">
                {editingUser ? 'ویرایش کاربر' : 'افزودن کاربر جدید'}
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">نام کاربری</label>
                  <input
                    type="text"
                    required
                    value={formData.username}
                    onChange={e => setFormData({ ...formData, username: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-800/50 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-colors"
                    placeholder="username"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">رمز عبور</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.password}
                      onChange={e => setFormData({ ...formData, password: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-800/50 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-colors"
                      placeholder={editingUser ? '••••••••' : 'تولید خودکار در صورت خالی بودن'}
                    />
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">محدودیت حجم کل (GB)</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.data_limit_gb}
                      onChange={e => setFormData({ ...formData, data_limit_gb: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-800/50 border border-slate-700 text-white focus:outline-none focus:border-brand-500 transition-colors"
                      placeholder="0 = نامحدود"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">محدودیت روزانه (GB)</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.daily_limit_gb}
                      onChange={e => setFormData({ ...formData, daily_limit_gb: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-800/50 border border-slate-700 text-white focus:outline-none focus:border-brand-500 transition-colors"
                      placeholder="0 = نامحدود"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">محدودیت زمانی (روز)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.time_limit_days}
                    onChange={e => setFormData({ ...formData, time_limit_days: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-800/50 border border-slate-700 text-white focus:outline-none focus:border-brand-500 transition-colors"
                    placeholder="0 = نامحدود"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-brand-600 focus:ring-brand-500/20 focus:ring-2"
                  />
                  <label htmlFor="is_active" className="text-sm text-slate-300">کاربر فعال باشد</label>
                </div>
              </div>

              <div className="flex gap-3 pt-4 mt-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors font-medium"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-brand-700 text-white hover:from-brand-500 hover:to-brand-600 transition-all font-medium shadow-lg shadow-brand-500/25"
                >
                  {editingUser ? 'ذخیره تغییرات' : 'افزودن کاربر'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
