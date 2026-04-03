import { NextRequest, NextResponse } from 'next/server'
import * as k8s from '@kubernetes/client-node'

const kc = new k8s.KubeConfig()
kc.loadFromDefault()

const k8sApi = kc.makeApiClient(k8s.CustomObjectsApi)

export async function POST(req: NextRequest) {
  const { services } = await req.json()

  const results = []

  for (const service of services) {
    try {
      await k8sApi.createNamespacedCustomObject({
        group: 'krishoperator.dev',
        version: 'v1',
        namespace: 'default',
        plural: 'apiservices',
        body: {
          apiVersion: 'krishoperator.dev/v1',
          kind: 'APIService',
          metadata: { name: `ui-${service}-${Date.now()}`, namespace: 'default' },
          spec: { type: service }
        }
      })
      results.push({ service, status: 'deployed' })
    } catch (e: any) {
      results.push({ service, status: 'failed', error: e.message })
    }
  }

  return NextResponse.json({ results })
}