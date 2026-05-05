import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const { phone, message } = await req.json()

  const instanceId = process.env.GREEN_API_INSTANCE_ID
  const token = process.env.GREEN_API_TOKEN

  if (!instanceId || !token) {
    return NextResponse.json({ error: 'No Green API credentials' }, { status: 500 })
  }

  const chatId = String(phone || '').replace(/\D/g, '') + '@c.us'

  const url = `https://api.green-api.com/waInstance${instanceId}/sendMessage/${token}`

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chatId, message }),
  })

  const data = await res.json()
  console.log('GREEN API RESULT:', data)

  if (!res.ok) {
    return NextResponse.json({ error: data }, { status: 400 })
  }

  return NextResponse.json({ success: true, data })
}
