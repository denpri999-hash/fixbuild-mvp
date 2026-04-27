import { normalizePhone } from './phone'

export type FoundEmployee = {
  employee_id: string
  company_id: string
  employee_name: string | null
  employee_phone: string | null
  normalized_phone: string
}

export async function findEmployeeByPhone(
  supabase: any,
  phone: string
): Promise<FoundEmployee | null> {
  const normalized = normalizePhone(phone)

  if (!normalized) return null

  const { data, error } = await supabase
    .from('employees')
    .select('id, company_id, name, phone, normalized_phone')
    .or(`normalized_phone.eq.${normalized},phone.eq.${phone},phone.eq.${normalized}`)
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('findEmployeeByPhone error:', error)
    return null
  }

  if (!data) return null

  return {
    employee_id: data.id,
    company_id: data.company_id,
    employee_name: data.name || null,
    employee_phone: data.phone || phone,
    normalized_phone: data.normalized_phone || normalized,
  }
}