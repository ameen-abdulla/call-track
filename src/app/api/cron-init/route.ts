import { NextResponse } from 'next/server'
import { initServer } from '@/lib/server-init'

export async function GET() {
  initServer()
  return NextResponse.json({ ok: true })
}
