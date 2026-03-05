export type UserRole = 'customer' | 'admin'

export type VmStatus = 'PROVISIONING' | 'RUNNING' | 'STOPPED' | 'ERROR'

export type NodeStatus = 'healthy' | 'warning' | 'critical' | 'maintenance'
export type NodeType = 'compute' | 'storage' | 'network'

export type CloudQuota = {
  vcpu: number
  ramGb: number
  storageGb: number
  instances: number
}

export type TenantStatus = 'ACTIVE' | 'DISABLED'

export type Tenant = {
  id: string
  name: string
  ownerEmail: string
  segment: 'enterprise' | 'mid-market' | 'startup'
  status: TenantStatus
  quota: CloudQuota
  is_active: boolean
  Quotum: {
    cpu_limit: number
    ram_limit: number
    disk_limit: number
    vm_limit: number
  }
  total_cpu: number
  total_ram: number
  total_disk: number
  total_vms: number
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
  zone: 'ru-central-1a' | 'ru-central-1b' | 'ru-central-1c'
  type: NodeType
  status: NodeStatus
  cpuLoad: number
  ramLoad: number
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

export type CreateTenantPayload = {
  name: string
  ownerEmail: string
  segment: 'startup' | 'corporate'
  quota: CloudQuota
}

export type UpdateTenantPayload = {
  id: string
  name: string
  ownerEmail: string
  quota: CloudQuota
}
