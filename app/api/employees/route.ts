import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // service role — bypasses RLS
)

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const companyId = searchParams.get('company_id')
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .eq('company_id', companyId)
  return NextResponse.json({ data, error })
}

export async function POST(req: Request) {
  const body = await req.json()
  const { data, error } = await supabase
    .from('employees')
    .insert(body)
    .select()
  return NextResponse.json({ data, error })
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  const { error } = await supabase
    .from('employees')
    .delete()
    .eq('id', id)
  return NextResponse.json({ error })
}

