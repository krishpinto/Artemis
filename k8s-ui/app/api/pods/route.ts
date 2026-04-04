import { NextResponse } from 'next/server'
import * as k8s from '@kubernetes/client-node'

const kc = new k8s.KubeConfig()
kc.loadFromDefault()
const coreApi = kc.makeApiClient(k8s.CoreV1Api)

export async function GET() {
  try {
    const res = await coreApi.listNamespacedPod({ namespace: 'default' })
    const pods = res.items
      .filter(p => p.status?.phase === 'Running')
      .map(p => p.metadata?.name || '')
    return NextResponse.json({ pods })
  } catch (e: any) {
    return NextResponse.json({ pods: [], error: e.message })
  }
}