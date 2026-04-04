import { NextResponse } from 'next/server'
import * as k8s from '@kubernetes/client-node'

const kc = new k8s.KubeConfig()
kc.loadFromDefault()
const coreApi = kc.makeApiClient(k8s.CoreV1Api)

async function getServicePort(name: string): Promise<number | null> {
  try {
    const res = await coreApi.readNamespacedService({ name, namespace: 'default' })
    const ports = res.spec?.ports
    if (!ports || ports.length === 0) return null
    return ports[0].nodePort ?? null
  } catch {
    return null
  }
}

export async function GET() {
  const [pgPort, redisPort, grafanaPort] = await Promise.all([
    getServicePort('artemis-postgres-svc'),
    getServicePort('artemis-redis-svc'),
    getServicePort('artemis-grafana-svc'),
  ])
  return NextResponse.json({ pgPort, redisPort, grafanaPort })
}