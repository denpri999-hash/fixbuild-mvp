import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  const id = body?.id
  const company_id = body?.company_id
  const updates = body?.updates

  if (!id || !company_id || !updates || typeof updates !== 'object') {
    return NextResponse.json(
      { data: null, error: { message: 'Invalid body. Expected { id, company_id, updates }' } },
      { status: 400 }
    )
  }

  const { data, error } = await supabase
    .from('problems')
    .update(updates)
    .eq('id', id)
    .eq('company_id', company_id)
    .select()

  return NextResponse.json({ data, error })
}

