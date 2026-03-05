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
import { infrastructureNodes, initialVms, vmFlavors, vmImages } from '../data/mockCloud'
import type {
  CreateVmPayload,
  InfrastructureNode,
  VirtualMachine,
  VmFlavor,
  VmImage,
} from '../types/cloud'

type CloudContextValue = {
  vms: VirtualMachine[]
  nodes: InfrastructureNode[]
  flavors: VmFlavor[]
  images: VmImage[]
  createVm: (payload: CreateVmPayload) => Promise<{ vmId: string }>
  deleteVm: (vmId: string) => void
}

const CloudContext = createContext<CloudContextValue | null>(null)
const API_BASE_URL = 'http://localhost:3000'

function buildIp() {
  const octet = Math.floor(Math.random() * 180) + 20
  return `10.10.10.${octet}`
}

export function CloudProvider({ children }: { children: ReactNode }) {
  const [vms, setVms] = useState<VirtualMachine[]>(initialVms)
  const timersRef = useRef<number[]>([])

  const createVm = useCallback(
    async (payload: CreateVmPayload) => {
      const flavor = vmFlavors.find((item) => item.id === payload.flavorId)
      const image = vmImages.find((item) => item.id === payload.imageId)

      if (!flavor || !image) {
        throw new Error('Unable to create VM with selected flavor/image.')
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
        setVms((prev) => prev.map((vm) => (vm.id === nextId ? { ...vm, status: 'RUNNING' } : vm)))
      }, 3000)

      timersRef.current.push(timerId)

      return { vmId: nextId }
    },
    [],
  )

  const deleteVm = useCallback((vmId: string) => {
    setVms((prev) => prev.filter((vm) => vm.id !== vmId))
  }, [])

  useEffect(
    () => () => {
      timersRef.current.forEach((timerId) => window.clearTimeout(timerId))
      timersRef.current = []
    },
    [],
  )

  const value = useMemo<CloudContextValue>(
    () => ({
      vms,
      nodes: infrastructureNodes,
      flavors: vmFlavors,
      images: vmImages,
      createVm,
      deleteVm,
    }),
    [vms, createVm, deleteVm],
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