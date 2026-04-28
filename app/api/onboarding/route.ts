import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const supabase = getSupabase()

    const { error } = await supabase.from('onboarding_requests').insert([
      {
        company_name: body.company_name,
        director_name: body.director_name,
        whatsapp_phone: body.whatsapp_phone,
        objects: body.objects,
        comment: body.comment,
      },
    ])

    if (error) {
      console.error(error)
      return NextResponse.json({ ok: false }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}