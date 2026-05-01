import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export function useCompany() {
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    async function load() {
      try {
        const { data } = await supabase.auth.getUser()
        const user = data?.user

        if (!active) return
        if (!user) {
          setCompanyId(null)
          setLoading(false)
          return
        }

        const { data: companyUser, error } = await supabase
          .from('company_users')
          .select('company_id')
          .eq('user_id', user.id)
          .limit(1)
          .maybeSingle()

        if (!active) return

        if (error) {
          console.error('useCompany: company_users lookup failed', error)
          setCompanyId(null)
        } else {
          setCompanyId(companyUser?.company_id ?? null)
        }
      } catch (e) {
        console.error('useCompany: failed', e)
        if (!active) return
        setCompanyId(null)
      } finally {
        if (!active) return
        setLoading(false)
      }
    }

    load()
    return () => {
      active = false
    }
  }, [])

  return { companyId, loading }
}

