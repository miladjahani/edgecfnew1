import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import type { SubUser, UserConfig } from '../types'

export function useSubUsers() {
  const [users, setUsers] = useState<SubUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const { data, error: fetchError } = await supabase
        .from('sub_users')
        .select('*')
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError
      setUsers(data || [])
      setError(null)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'خطا در دریافت کاربران')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const addUser = async (user: Omit<SubUser, 'id' | 'created_at' | 'usage_gb' | 'last_reset'>) => {
    try {
      const { data, error: insertError } = await supabase
        .from('sub_users')
        .insert([user])
        .select()
        .single()

      if (insertError) throw insertError
      await fetchUsers()
      return data
    } catch (err: unknown) {
      throw new Error(err instanceof Error ? err.message : 'خطا در افزودن کاربر')
    }
  }

  const updateUser = async (id: string, updates: Partial<SubUser>) => {
    try {
      const { error: updateError } = await supabase
        .from('sub_users')
        .update(updates)
        .eq('id', id)

      if (updateError) throw updateError
      await fetchUsers()
    } catch (err: unknown) {
      throw new Error(err instanceof Error ? err.message : 'خطا در ویرایش کاربر')
    }
  }

  const deleteUser = async (id: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('sub_users')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError
      await fetchUsers()
    } catch (err: unknown) {
      throw new Error(err instanceof Error ? err.message : 'خطا در حذف کاربر')
    }
  }

  const createUserConfig = async (config: Omit<UserConfig, 'id' | 'created_at' | 'last_used'>) => {
    try {
      const { data, error: insertError } = await supabase
        .from('user_configs')
        .insert([config])
        .select()
        .single()

      if (insertError) throw insertError
      return data
    } catch (err: unknown) {
      throw new Error(err instanceof Error ? err.message : 'خطا در ایجاد کانفیگ')
    }
  }

  const getUserConfigs = async (userId: string) => {
    try {
      const { data, error: fetchError } = await supabase
        .from('user_configs')
        .select('*')
        .eq('user_id', userId)

      if (fetchError) throw fetchError
      return data || []
    } catch (err: unknown) {
      throw new Error(err instanceof Error ? err.message : 'خطا در دریافت کانفیگ‌ها')
    }
  }

  return {
    users,
    loading,
    error,
    addUser,
    updateUser,
    deleteUser,
    createUserConfig,
    getUserConfigs,
    refresh: fetchUsers,
  }
}
