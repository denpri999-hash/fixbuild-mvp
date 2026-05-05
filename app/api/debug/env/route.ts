import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    hasGreenInstanceId: Boolean(process.env.GREEN_API_INSTANCE_ID),
    hasGreenToken: Boolean(process.env.GREEN_API_TOKEN),
    instanceIdLength: process.env.GREEN_API_INSTANCE_ID?.length ?? 0,
    tokenLength: process.env.GREEN_API_TOKEN?.length ?? 0,
  })
}

