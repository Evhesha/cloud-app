import type { InfrastructureNode, Tenant, VirtualMachine, VmFlavor, VmImage } from '../types/cloud'

export const vmFlavors: VmFlavor[] = [
  { id: 'small', name: 'Small', vcpu: 2, ramGb: 4, storageGb: 80, monthlyPrice: 15 },
  { id: 'medium', name: 'Medium', vcpu: 4, ramGb: 8, storageGb: 160, monthlyPrice: 40 },
  { id: 'large', name: 'Large', vcpu: 8, ramGb: 16, storageGb: 320, monthlyPrice: 85 },
]

export const vmImages: VmImage[] = [
  { id: 'ubuntu-22', name: 'Ubuntu 22.04 LTS' },
  { id: 'centos-9', name: 'CentOS Stream 9' },
  { id: 'windows-2022', name: 'Windows Server 2022' },
]

export const tenants: Tenant[] = [
  {
    id: 'tenant-acme',
    name: 'Acme Systems',
    ownerEmail: 'owner@acme.io',
    segment: 'enterprise',
    quota: { vcpu: 24, ramGb: 64, storageGb: 1200, instances: 10 },
  },
  {
    id: 'tenant-northwind',
    name: 'Northwind Data',
    ownerEmail: 'owner@northwind.io',
    segment: 'mid-market',
    quota: { vcpu: 16, ramGb: 48, storageGb: 900, instances: 8 },
  },
  {
    id: 'tenant-vertex',
    name: 'Vertex Labs',
    ownerEmail: 'owner@vertex.io',
    segment: 'startup',
    quota: { vcpu: 8, ramGb: 24, storageGb: 500, instances: 5 },
  },
]

export const tenantByUserEmail: Record<string, string> = {
  'owner@acme.io': 'tenant-acme',
  'owner@northwind.io': 'tenant-northwind',
  'owner@vertex.io': 'tenant-vertex',
}

export const initialVms: VirtualMachine[] = [
  {
    id: 'vm-1001',
    tenantId: 'tenant-acme',
    name: 'web-gateway-01',
    status: 'RUNNING',
    vcpu: 4,
    ramGb: 8,
    storageGb: 160,
    osImage: 'Ubuntu 22.04 LTS',
    ip: '10.10.10.11',
  },
  {
    id: 'vm-1002',
    tenantId: 'tenant-acme',
    name: 'billing-api-01',
    status: 'RUNNING',
    vcpu: 4,
    ramGb: 8,
    storageGb: 160,
    osImage: 'Ubuntu 22.04 LTS',
    ip: '10.10.10.12',
  },
  {
    id: 'vm-1003',
    tenantId: 'tenant-acme',
    name: 'analytics-worker-01',
    status: 'STOPPED',
    vcpu: 2,
    ramGb: 4,
    storageGb: 80,
    osImage: 'CentOS Stream 9',
    ip: '10.10.10.13',
  },
  {
    id: 'vm-2001',
    tenantId: 'tenant-northwind',
    name: 'northwind-core-01',
    status: 'RUNNING',
    vcpu: 6,
    ramGb: 16,
    storageGb: 220,
    osImage: 'Ubuntu 22.04 LTS',
    ip: '10.20.10.11',
  },
  {
    id: 'vm-3001',
    tenantId: 'tenant-vertex',
    name: 'vertex-api-01',
    status: 'RUNNING',
    vcpu: 2,
    ramGb: 4,
    storageGb: 80,
    osImage: 'Windows Server 2022',
    ip: '10.30.10.11',
  },
]

const nodeTypes = ['compute', 'storage', 'network'] as const

function buildNode(
  prefix: string,
  index: number,
  zone: 'ru-central-1a' | 'ru-central-1b' | 'ru-central-1c',
  status: InfrastructureNode['status'],
): InfrastructureNode {
  const type = nodeTypes[index % nodeTypes.length]
  return {
    id: `${prefix}-${index + 1}`,
    zone,
    type,
    status,
    cpuLoad: 28 + ((index * 11) % 62),
    ramLoad: 24 + ((index * 7) % 68),
  }
}

export const infrastructureNodes: InfrastructureNode[] = [
  ...Array.from({ length: 10 }, (_, index) => buildNode('node-a', index, 'ru-central-1a', 'healthy')),
  ...Array.from({ length: 8 }, (_, index) => buildNode('node-b', index, 'ru-central-1b', 'healthy')),
  buildNode('node-b', 8, 'ru-central-1b', 'warning'),
  buildNode('node-b', 9, 'ru-central-1b', 'critical'),
  ...Array.from({ length: 8 }, (_, index) => buildNode('node-c', index, 'ru-central-1c', 'healthy')),
  buildNode('node-c', 8, 'ru-central-1c', 'maintenance'),
]
