import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { phone, message } = await req.json()
    if (!phone || !message) {
      return NextResponse.json({ error: 'phone and message required' }, { status: 400 })
    }
    const instanceId = process.env.GREEN_API_INSTANCE_ID
    const token = process.env.GREEN_API_TOKEN
    if (!instanceId || !token) {
      console.error('GREEN API ENV MISSING', { hasInstanceId: Boolean(instanceId), hasToken: Boolean(token) })
      return NextResponse.json({ error: 'Green API env missing' }, { status: 500 })
    }
    const cleanPhone = String(phone).replace(/\D/g, '')
    const chatId = `${cleanPhone}@c.us`
    const greenUrl = `https://api.green-api.com/waInstance${instanceId}/sendMessage/${token}`
    const greenRes = await fetch(greenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatId, message })
    })
    const greenText = await greenRes.text()
    console.log('GREEN API RESPONSE:', { status: greenRes.status, ok: greenRes.ok, body: greenText, chatId })
    if (!greenRes.ok) {
      return NextResponse.json({ error: 'Green API failed', details: greenText }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('WHATSAPP SEND ERROR:', error)
    return NextResponse.json({ error: error?.message }, { status: 500 })
  }
}
