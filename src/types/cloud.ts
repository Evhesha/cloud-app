export type UserRole = 'customer' | 'admin'

export type VmStatus = 'PROVISIONING' | 'RUNNING' | 'STOPPED' | 'ERROR'

export type NodeStatus = 'healthy' | 'warning' | 'critical' | 'maintenance'

export type CloudQuota = {
  vcpu: number
  ramGb: number
  storageGb: number
  instances: number
}

export type Tenant = {
  id: string
  name: string
  segment: 'enterprise' | 'mid-market' | 'startup'
  quota: CloudQuota
}

export type VirtualMachine = {
  id: string
  tenantId: string
  name: string
  status: VmStatus
  vcpu: number
  ramGb: number
  storageGb: number
  osImage: string
  ip: string
}

export type TenantUsage = {
  vcpu: number
  ramGb: number
  storageGb: number
  instances: number
}

export type InfrastructureNode = {
  id: string
  zone: string
  status: NodeStatus
}

export type VmFlavor = {
  id: string
  name: string
  vcpu: number
  ramGb: number
  storageGb: number
  monthlyPrice: number
}

export type VmImage = {
  id: string
  name: string
}

export type CreateVmPayload = {
  tenantId: string
  name: string
  flavorId: string
  imageId: string
}
