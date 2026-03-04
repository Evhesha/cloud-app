/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useEffect,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { infrastructureNodes, initialVms, tenants, vmFlavors, vmImages } from '../data/mockCloud'
import type {
  CreateVmPayload,
  InfrastructureNode,
  Tenant,
  TenantUsage,
  VirtualMachine,
  VmFlavor,
  VmImage,
} from '../types/cloud'

type CloudContextValue = {
  tenants: Tenant[]
  vms: VirtualMachine[]
  nodes: InfrastructureNode[]
  flavors: VmFlavor[]
  images: VmImage[]
  activeTenantId: string
  activeTenant: Tenant
  setActiveTenantId: (tenantId: string) => void
  getTenantUsage: (tenantId: string) => TenantUsage
  canDeployForTenant: (tenantId: string, flavorId: string) => { ok: boolean; reason: string | null }
  createVm: (payload: CreateVmPayload) => Promise<{ vmId: string }>
}

const CloudContext = createContext<CloudContextValue | null>(null)

function buildIp() {
  const octet = Math.floor(Math.random() * 180) + 20
  return `10.10.10.${octet}`
}

function sumUsage(machines: VirtualMachine[]): TenantUsage {
  return machines.reduce(
    (acc, vm) => {
      acc.vcpu += vm.vcpu
      acc.ramGb += vm.ramGb
      acc.storageGb += vm.storageGb
      acc.instances += 1
      return acc
    },
    { vcpu: 0, ramGb: 0, storageGb: 0, instances: 0 },
  )
}

export function CloudProvider({ children }: { children: ReactNode }) {
  const [vms, setVms] = useState<VirtualMachine[]>(initialVms)
  const [activeTenantId, setActiveTenantId] = useState<string>(tenants[0].id)
  const timersRef = useRef<number[]>([])

  const getTenantUsage = useCallback(
    (tenantId: string) => sumUsage(vms.filter((vm) => vm.tenantId === tenantId)),
    [vms],
  )

  const canDeployForTenant = useCallback(
    (tenantId: string, flavorId: string) => {
      const tenant = tenants.find((item) => item.id === tenantId)
      const flavor = vmFlavors.find((item) => item.id === flavorId)

      if (!tenant || !flavor) {
        return { ok: false, reason: 'Invalid tenant or flavor selection.' }
      }

      const current = getTenantUsage(tenantId)
      const currentExceeded =
        current.vcpu > tenant.quota.vcpu ||
        current.ramGb > tenant.quota.ramGb ||
        current.storageGb > tenant.quota.storageGb ||
        current.instances > tenant.quota.instances

      if (currentExceeded) {
        return {
          ok: false,
          reason: 'Current usage already exceeds quota. Deploy is blocked until resources are reduced.',
        }
      }

      const projected = {
        vcpu: current.vcpu + flavor.vcpu,
        ramGb: current.ramGb + flavor.ramGb,
        storageGb: current.storageGb + flavor.storageGb,
        instances: current.instances + 1,
      }

      const projectedExceeded =
        projected.vcpu > tenant.quota.vcpu ||
        projected.ramGb > tenant.quota.ramGb ||
        projected.storageGb > tenant.quota.storageGb ||
        projected.instances > tenant.quota.instances

      if (projectedExceeded) {
        return {
          ok: false,
          reason: 'Deploying this flavor would exceed tenant quota.',
        }
      }

      return { ok: true, reason: null }
    },
    [getTenantUsage],
  )

  const createVm = useCallback(async (payload: CreateVmPayload) => {
    const flavor = vmFlavors.find((item) => item.id === payload.flavorId)
    const image = vmImages.find((item) => item.id === payload.imageId)

    if (!flavor || !image) {
      throw new Error('Unable to create VM with selected flavor/image.')
    }

    const validation = canDeployForTenant(payload.tenantId, payload.flavorId)
    if (!validation.ok) {
      throw new Error(validation.reason ?? 'Deploy is blocked by resource guard.')
    }

    const nextId = `vm-${Date.now()}`
    const provisioningVm: VirtualMachine = {
      id: nextId,
      tenantId: payload.tenantId,
      name: payload.name,
      status: 'PROVISIONING',
      vcpu: flavor.vcpu,
      ramGb: flavor.ramGb,
      storageGb: flavor.storageGb,
      osImage: image.name,
      ip: buildIp(),
    }

    setVms((prev) => [provisioningVm, ...prev])

    const timerId = window.setTimeout(() => {
      setVms((prev) =>
        prev.map((vm) => (vm.id === nextId ? { ...vm, status: 'RUNNING' } : vm)),
      )
    }, 3000)

    timersRef.current.push(timerId)

    return { vmId: nextId }
  }, [canDeployForTenant])

  useEffect(
    () => () => {
      timersRef.current.forEach((timerId) => window.clearTimeout(timerId))
      timersRef.current = []
    },
    [],
  )

  const activeTenant = useMemo(
    () => tenants.find((item) => item.id === activeTenantId) ?? tenants[0],
    [activeTenantId],
  )

  const value = useMemo<CloudContextValue>(
    () => ({
      tenants,
      vms,
      nodes: infrastructureNodes,
      flavors: vmFlavors,
      images: vmImages,
      activeTenantId,
      activeTenant,
      setActiveTenantId,
      getTenantUsage,
      canDeployForTenant,
      createVm,
    }),
    [activeTenant, activeTenantId, canDeployForTenant, createVm, getTenantUsage, vms],
  )

  return <CloudContext.Provider value={value}>{children}</CloudContext.Provider>
}

export function useCloud() {
  const context = useContext(CloudContext)
  if (!context) {
    throw new Error('useCloud must be used inside CloudProvider')
  }

  return context
}
