import { Injectable } from '@angular/core'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { exec } from 'child_process'

export interface GcpInstance {
    id: string
    name: string
    zone: string
    project: string
    machineType: string
    status: 'RUNNING' | 'TERMINATED' | 'STOPPED' | 'STAGING' | 'PROVISIONING' | string
    publicIp?: string
    privateIp?: string
    isActing?: boolean
}

export interface GcpProject {
    projectId: string
    name?: string
    isCurrent?: boolean
}

@Injectable({ providedIn: 'root' })
export class GcpService {
    getProjects (): GcpProject[] {
        const results: GcpProject[] = []
        const candidates = [
            path.join('/root/.config/gcloud/configurations/config_default'),
            path.join(os.homedir(), '.config/gcloud/configurations/config_default'),
            path.join('/mnt/c/Users/vibis/AppData/Roaming/gcloud/configurations/config_default'),
            path.join(process.env.APPDATA || '', 'gcloud/configurations/config_default'),
        ]

        for (const file of candidates) {
            try {
                if (file && fs.existsSync(file)) {
                    const content = fs.readFileSync(file, 'utf-8')
                    const match = content.match(/project\s*=\s*([^\r\n]+)/)
                    if (match && match[1]) {
                        const pid = match[1].trim()
                        if (pid && !results.some(r => r.projectId === pid)) {
                            results.push({ projectId: pid, name: pid, isCurrent: true })
                        }
                    }
                }
            } catch (e) {
                console.warn('[tabby-infrastructure] Could not read gcloud config:', file, e)
            }
        }

        if (results.length === 0) {
            results.push({ projectId: 'main-project-acc-01', name: 'main-project-acc-01', isCurrent: true })
        }

        return results
    }

    async describeInstances (projectId?: string): Promise<GcpInstance[]> {
        return new Promise((resolve) => {
            const projArg = projectId ? `--project=${projectId}` : ''
            const cmd = `gcloud compute instances list ${projArg} --format=json`

            exec(cmd, { timeout: 10000, maxBuffer: 10 * 1024 * 1024 }, (err, stdout) => {
                if (err || !stdout) {
                    console.warn('[tabby-infrastructure] gcloud compute instances list error or no output:', err?.message)
                    resolve([])
                    return
                }

                try {
                    const data = JSON.parse(stdout)
                    const instances: GcpInstance[] = []

                    for (const item of data) {
                        const zoneParts = (item.zone || '').split('/')
                        const zone = zoneParts.pop() || item.zone || ''
                        const machineParts = (item.machineType || '').split('/')
                        const machineType = machineParts.pop() || item.machineType || 'e2-medium'

                        let publicIp: string | undefined
                        let privateIp: string | undefined

                        for (const nic of item.networkInterfaces || []) {
                            if (nic.networkIP) privateIp = nic.networkIP
                            for (const ac of nic.accessConfigs || []) {
                                if (ac.natIP) publicIp = ac.natIP
                            }
                        }

                        instances.push({
                            id: item.id || item.name,
                            name: item.name,
                            zone,
                            project: projectId || 'default',
                            machineType,
                            status: item.status || 'TERMINATED',
                            publicIp,
                            privateIp,
                        })
                    }

                    resolve(instances)
                } catch {
                    resolve([])
                }
            })
        })
    }

    async startInstance (name: string, zone: string, project: string): Promise<boolean> {
        return new Promise((resolve) => {
            const cmd = `gcloud compute instances start "${name}" --zone="${zone}" --project="${project}"`
            exec(cmd, { timeout: 60000 }, (err) => {
                resolve(!err)
            })
        })
    }

    async stopInstance (name: string, zone: string, project: string): Promise<boolean> {
        return new Promise((resolve) => {
            const cmd = `gcloud compute instances stop "${name}" --zone="${zone}" --project="${project}"`
            exec(cmd, { timeout: 60000 }, (err) => {
                resolve(!err)
            })
        })
    }

    async resetInstance (name: string, zone: string, project: string): Promise<boolean> {
        return new Promise((resolve) => {
            const cmd = `gcloud compute instances reset "${name}" --zone="${zone}" --project="${project}"`
            exec(cmd, { timeout: 60000 }, (err) => {
                resolve(!err)
            })
        })
    }

    async describeSingleInstance (name: string, zone: string, projectId?: string): Promise<GcpInstance | null> {
        return new Promise((resolve) => {
            const projArg = projectId ? `--project=${projectId}` : ''
            const cmd = `gcloud compute instances describe ${name} --zone=${zone} ${projArg} --format=json`
            exec(cmd, { timeout: 10000, maxBuffer: 5 * 1024 * 1024 }, (err, stdout) => {
                if (err || !stdout) {
                    resolve(null)
                    return
                }
                try {
                    const inst = JSON.parse(stdout)
                    const status = inst.status ? inst.status.toUpperCase() : 'UNKNOWN'
                    let publicIp: string | undefined
                    let privateIp: string | undefined
                    if (inst.networkInterfaces && inst.networkInterfaces.length > 0) {
                        const nic = inst.networkInterfaces[0]
                        privateIp = nic.networkIP
                        if (nic.accessConfigs && nic.accessConfigs.length > 0) {
                            publicIp = nic.accessConfigs[0].natIP
                        }
                    }
                    resolve({
                        id: inst.id || inst.name,
                        name: inst.name,
                        zone,
                        project: projectId || '',
                        machineType: inst.machineType ? inst.machineType.split('/').pop() || '' : '',
                        status,
                        publicIp,
                        privateIp,
                    })
                } catch {
                    resolve(null)
                }
            })
        })
    }
}
