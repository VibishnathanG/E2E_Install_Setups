import { Injectable } from '@angular/core'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { exec } from 'child_process'

export interface AzureVM {
    id: string
    name: string
    resourceGroup: string
    state: 'running' | 'stopped' | 'deallocated' | 'stopping' | 'starting' | string
    vmSize: string
    location: string
    publicIp?: string
    privateIp?: string
    adminUsername?: string
    subscriptionId?: string
    subscriptionName?: string
    isActing?: boolean
}

export interface AzureSubscription {
    id: string
    name: string
    isDefault?: boolean
}

@Injectable({ providedIn: 'root' })
export class AzureService {
    getSubscriptions (): AzureSubscription[] {
        const results: AzureSubscription[] = []
        const candidates = [
            path.join('/mnt/c/Users/vibis/.azure/azureProfile.json'),
            path.join(process.env.USERPROFILE || '', '.azure/azureProfile.json'),
            path.join(os.homedir(), '.azure/azureProfile.json'),
            path.join('/root/.azure/azureProfile.json'),
        ]

        for (const file of candidates) {
            try {
                if (file && fs.existsSync(file)) {
                    const raw = fs.readFileSync(file, 'utf-8')
                    const data = JSON.parse(raw)
                    if (data.subscriptions && Array.isArray(data.subscriptions)) {
                        for (const sub of data.subscriptions) {
                            if (sub.name && !results.some(r => r.id === sub.id)) {
                                results.push({
                                    id: sub.id,
                                    name: sub.name,
                                    isDefault: !!sub.isDefault,
                                })
                            }
                        }
                    }
                }
            } catch (e) {
                console.warn('[tabby-infrastructure] Could not read azureProfile.json:', file, e)
            }
        }

        if (results.length === 0) {
            results.push({ id: 'default', name: 'main-sbox-sub-1', isDefault: true })
        }

        return results
    }

    async describeVMs (subscriptionId?: string): Promise<AzureVM[]> {
        return new Promise((resolve) => {
            const subArg = subscriptionId && subscriptionId !== 'default' ? `--subscription ${subscriptionId}` : ''
            const cmd = `az vm list -d ${subArg} --output json`

            exec(cmd, { timeout: 10000, maxBuffer: 10 * 1024 * 1024 }, (err, stdout) => {
                if (err || !stdout) {
                    console.warn('[tabby-infrastructure] az vm list error or no output:', err?.message)
                    // Fallback to sample/configured VMs or empty
                    resolve([])
                    return
                }

                try {
                    const data = JSON.parse(stdout)
                    const vms: AzureVM[] = []

                    for (const item of data) {
                        const rawPower = item.powerState || ''
                        let state = 'stopped'
                        if (rawPower.toLowerCase().includes('running')) {
                            state = 'running'
                        } else if (rawPower.toLowerCase().includes('deallocated')) {
                            state = 'stopped'
                        } else if (rawPower.toLowerCase().includes('stopping')) {
                            state = 'stopping'
                        } else if (rawPower.toLowerCase().includes('starting')) {
                            state = 'starting'
                        }

                        vms.push({
                            id: item.id || item.name,
                            name: item.name,
                            resourceGroup: item.resourceGroup || '',
                            state,
                            vmSize: item.hardwareProfile ? item.hardwareProfile.vmSize : 'Standard',
                            location: item.location || '',
                            publicIp: item.publicIps || undefined,
                            privateIp: item.privateIps || undefined,
                            adminUsername: item.osProfile ? item.osProfile.adminUsername : 'azureuser',
                        })
                    }

                    resolve(vms)
                } catch {
                    resolve([])
                }
            })
        })
    }

    async startVM (resourceGroup: string, name: string): Promise<boolean> {
        return new Promise((resolve) => {
            const cmd = `az vm start -g "${resourceGroup}" -n "${name}"`
            exec(cmd, { timeout: 60000 }, (err) => {
                resolve(!err)
            })
        })
    }

    async stopVM (resourceGroup: string, name: string): Promise<boolean> {
        return new Promise((resolve) => {
            const cmd = `az vm deallocate -g "${resourceGroup}" -n "${name}"`
            exec(cmd, { timeout: 60000 }, (err) => {
                resolve(!err)
            })
        })
    }

    async restartVM (resourceGroup: string, name: string): Promise<boolean> {
        return new Promise((resolve) => {
            const cmd = `az vm restart -g "${resourceGroup}" -n "${name}"`
            exec(cmd, { timeout: 60000 }, (err) => {
                resolve(!err)
            })
        })
    }

    async describeSingleVM (resourceGroup: string, name: string, subscriptionId?: string): Promise<AzureVM | null> {
        return new Promise((resolve) => {
            const subArg = subscriptionId && subscriptionId !== 'default' ? `--subscription ${subscriptionId}` : ''
            const cmd = `az vm get-instance-view -g "${resourceGroup}" -n "${name}" ${subArg} --output json`
            exec(cmd, { timeout: 10000, maxBuffer: 5 * 1024 * 1024 }, (err, stdout) => {
                if (err || !stdout) {
                    resolve(null)
                    return
                }
                try {
                    const data = JSON.parse(stdout)
                    let state = 'stopped'
                    for (const s of data.statuses || []) {
                        const code = s.code || ''
                        if (code.startsWith('PowerState/')) {
                            const raw = code.replace('PowerState/', '').toLowerCase()
                            if (raw.includes('running')) state = 'running'
                            else if (raw.includes('deallocated') || raw.includes('stopped')) state = 'stopped'
                            else if (raw.includes('stopping')) state = 'stopping'
                            else if (raw.includes('starting')) state = 'starting'
                        }
                    }
                    resolve({
                        id: name,
                        name,
                        resourceGroup,
                        state,
                        vmSize: '',
                        location: '',
                    })
                } catch {
                    resolve(null)
                }
            })
        })
    }
}
