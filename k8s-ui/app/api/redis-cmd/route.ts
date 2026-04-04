import { NextRequest, NextResponse } from 'next/server'
import Redis from 'ioredis'

export async function POST(req: NextRequest) {
  const { key, value } = await req.json()

  const redis = new Redis({
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    connectTimeout: 3000,
    lazyConnect: true
  })

  try {
    await redis.connect()
    await redis.set(key, value)
    const all = await redis.keys('*')
    const data: any = {}
    for (const k of all.slice(0, 20)) {
      data[k] = await redis.get(k)
    }
    await redis.quit()
    return NextResponse.json({ keys: data })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}