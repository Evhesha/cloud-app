import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { NavLink, useNavigate, useParams } from 'react-router-dom'
import Cookies from 'js-cookie'
import { StatusPill } from '../shared/StatusPill'
import type { VmStatus } from '../../types/cloud'

type ApiVirtualMachine = {
  id: number
  tenant_id: number
  name: string
  status: 'creating' | 'running' | 'stopped' | 'suspended' | 'deleted'
  cpu: number
  ram: number
  disk: number
  image: string
  ip_address: string | null
}

type VirtualMachine = {
  id: number
  tenantId: number
  name: string
  status: VmStatus
  vcpu: number
  ramGb: number
  storageGb: number
  osImage: string
  ip: string
}

function mapVmStatus(status: ApiVirtualMachine['status']): VmStatus {
  if (status === 'running') return 'RUNNING'
  if (status === 'stopped') return 'STOPPED'
  if (status === 'creating') return 'PROVISIONING'
  return 'ERROR'
}

export function InstanceManagementScreen() {
  const navigate = useNavigate()
  const { instanceId } = useParams<{ instanceId: string }>()
  const vmId = Number(instanceId)

  const [vm, setVm] = useState<VirtualMachine | null>(null)
  const [loading, setLoading] = useState(true)
  const [files, setFiles] = useState<Array<{ name: string; size: number; modified: string }>>([])
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [selectedFileContent, setSelectedFileContent] = useState<string>('')
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    const fetchVm = async () => {
      try {
        setLoading(true)
        const token = Cookies.get('token')
        const response = await fetch(`http://localhost:3000/vms/${vmId}`, {
          method: 'GET',
          credentials: 'include',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          throw new Error('Failed to load instance')
        }

        const apiVm: ApiVirtualMachine = await response.json()
        setVm({
          id: apiVm.id,
          tenantId: apiVm.tenant_id,
          name: apiVm.name,
          status: mapVmStatus(apiVm.status),
          vcpu: apiVm.cpu,
          ramGb: Number(apiVm.ram) / 1024,
          storageGb: Number(apiVm.disk),
          osImage: apiVm.image,
          ip: apiVm.ip_address || '-',
        })
      } catch (error) {
        console.error('Error loading instance:', error)
        setVm(null)
      } finally {
        setLoading(false)
      }
    }

    if (Number.isFinite(vmId)) {
      void fetchVm()
    } else {
      setLoading(false)
    }
  }, [vmId])

  const loadFiles = useCallback(async () => {
    if (!Number.isFinite(vmId)) return

    try {
      const token = Cookies.get('token')
      const response = await fetch(`http://localhost:3000/vms/${vmId}/files`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to load files')
      }

      const data = await response.json()
      setFiles(data)
    } catch (error) {
      console.error('Error loading files:', error)
      setFiles([])
    }
  }, [vmId])

  useEffect(() => {
    if (!vm) return
    void loadFiles()
  }, [vm, loadFiles])

  const powerAction = useMemo(() => (vm?.status === 'RUNNING' ? 'stop' : 'start'), [vm])

  const handleTogglePower = async () => {
    if (!vm) return

    try {
      const token = Cookies.get('token')
      const response = await fetch(`http://localhost:3000/vms/${vm.id}/${powerAction}`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Failed to ${powerAction} instance`)
      }

      setVm((prev) => (prev ? { ...prev, status: powerAction === 'start' ? 'RUNNING' : 'STOPPED' } : prev))
    } catch (error) {
      console.error(`Error trying to ${powerAction} instance:`, error)
      alert(error instanceof Error ? error.message : `Unable to ${powerAction} instance.`)
    }
  }

  const handleDelete = async () => {
    if (!vm) return

    try {
      const shouldDeleteVm = confirm(`Delete instance "${vm.name}"?`)
      if (!shouldDeleteVm) {
        return
      }

      const shouldDeleteImage = confirm(`Also delete image "${vm.osImage}" from host?`)
      const token = Cookies.get('token')
      const response = await fetch(`http://localhost:3000/vms/${vm.id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ remove_image: shouldDeleteImage }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete instance')
      }

      navigate('/customer-dashboard')
    } catch (error) {
      console.error('Error deleting instance:', error)
      alert(error instanceof Error ? error.message : 'Unable to delete instance.')
    }
  }

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0 || !vm) {
      return
    }

    try {
      setUploading(true)
      const token = Cookies.get('token')
      const formData = new FormData()

      Array.from(event.target.files).forEach((file) => {
        formData.append('files', file)
      })

      const response = await fetch(`http://localhost:3000/vms/${vm.id}/upload`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to upload files')
      }

      await loadFiles()
    } catch (error) {
      console.error('Error uploading files:', error)
      alert(error instanceof Error ? error.message : 'Unable to upload files.')
    } finally {
      setUploading(false)
      event.target.value = ''
    }
  }

  const handlePreviewFile = async (fileName: string) => {
    if (!vm) return

    try {
      const token = Cookies.get('token')
      const response = await fetch(`http://localhost:3000/vms/${vm.id}/files/${encodeURIComponent(fileName)}/content`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to read file')
      }

      const data = await response.json()
      setSelectedFile(fileName)
      setSelectedFileContent(data.content || '')
    } catch (error) {
      console.error('Error reading file:', error)
      alert(error instanceof Error ? error.message : 'Unable to preview file.')
    }
  }

  const handleDeleteFile = async (fileName: string) => {
    if (!vm) return

    try {
      const shouldDelete = confirm(`Delete file "${fileName}"?`)
      if (!shouldDelete) {
        return
      }

      const token = Cookies.get('token')
      const response = await fetch(`http://localhost:3000/vms/${vm.id}/files/${encodeURIComponent(fileName)}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete file')
      }

      if (selectedFile === fileName) {
        setSelectedFile(null)
        setSelectedFileContent('')
      }

      await loadFiles()
    } catch (error) {
      console.error('Error deleting file:', error)
      alert(error instanceof Error ? error.message : 'Unable to delete file.')
    }
  }

  if (loading) {
    return (
      <section className="mts-page">
        <main className="mts-main">
          <div style={{ textAlign: 'center', padding: '40px' }}>Loading...</div>
        </main>
      </section>
    )
  }

  if (!vm) {
    return (
      <section className="mts-page">
        <main className="mts-main">
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <h2>Instance Not Found</h2>
            <NavLink to="/customer-dashboard" className="btn-primary-pill">
              Back to Dashboard
            </NavLink>
          </div>
        </main>
      </section>
    )
  }

  return (
    <section className="mts-page">
      <main className="mts-main">
        <header className="page-head">
          <div>
            <p className="mts-kicker">Instance Management</p>
            <h2>{vm.name}</h2>
            <p>{`Instance #${vm.id}`}</p>
          </div>
          <NavLink to="/customer-dashboard" className="btn-secondary-pill">
            Back
          </NavLink>
        </header>

        <section className="panel-flat">
          <div className="panel-head-inline">
            <div>
              <h3>Instance Details</h3>
              <p>Manage lifecycle and deletion options</p>
            </div>
          </div>

          <div className="quota-stack" style={{ marginBottom: '16px' }}>
            <span>Status: <StatusPill status={vm.status} /></span>
            <span>Resources: {vm.vcpu} vCPU / {vm.ramGb}GB RAM / {vm.storageGb}GB Storage</span>
            <span>Image: {vm.osImage}</span>
            <span>IP: {vm.ip}</span>
          </div>

          <div className="tenant-actions">
            <button
              type="button"
              className="btn-primary-pill"
              onClick={() => void handleTogglePower()}
            >
              {vm.status === 'RUNNING' ? 'Stop Instance' : 'Start Instance'}
            </button>
            <button
              type="button"
              className="btn-secondary-pill"
              onClick={() => void handleDelete()}
            >
              Delete Instance
            </button>
          </div>
        </section>

        <section className="panel-flat">
          <div className="panel-head-inline">
            <div>
              <h3>Static Files</h3>
              <p>Upload and preview files for this instance</p>
            </div>
          </div>

          <div className="tenant-actions" style={{ marginBottom: '16px' }}>
            <label className="btn-primary-pill" style={{ cursor: uploading ? 'not-allowed' : 'pointer', opacity: uploading ? 0.6 : 1 }}>
              {uploading ? 'Uploading...' : 'Upload Files'}
              <input type="file" multiple onChange={(event) => void handleUpload(event)} style={{ display: 'none' }} disabled={uploading} />
            </label>
          </div>

          <div className="table-shell" style={{ marginBottom: '16px' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Size</th>
                  <th>Modified</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {files.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '20px' }}>
                      No files uploaded
                    </td>
                  </tr>
                ) : (
                  files.map((file) => (
                    <tr key={file.name}>
                      <td>{file.name}</td>
                      <td>{file.size} B</td>
                      <td>{new Date(file.modified).toLocaleString()}</td>
                      <td>
                        <div className="tenant-actions">
                          <button type="button" className="btn-secondary-pill" onClick={() => void handlePreviewFile(file.name)}>
                            Preview
                          </button>
                          <button type="button" className="btn-primary-pill" onClick={() => void handleDeleteFile(file.name)}>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {selectedFile && (
            <div>
              <p><strong>Preview:</strong> {selectedFile}</p>
              <iframe
                title={`preview-${selectedFile}`}
                srcDoc={selectedFileContent}
                style={{ width: '100%', minHeight: '320px', border: '1px solid #ddd', borderRadius: '8px' }}
              />
            </div>
          )}
        </section>
      </main>
    </section>
  )
}
