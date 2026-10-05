import { Injectable } from '@angular/core'
import * as net from 'net'

export interface HostStatus {
    reachable: boolean
    latency: number
    checking: boolean
    lastChecked?: Date
}

@Injectable({ providedIn: 'root' })
export class PingService {
    private cache = new Map<string, HostStatus>()

    async checkHost (host: string, port = 22, timeout = 2000): Promise<HostStatus> {
        const key = `${host}:${port}`
        const cached = this.cache.get(key)
        if (cached && !cached.checking && cached.lastChecked && (Date.now() - cached.lastChecked.getTime() < 10000)) {
            return cached
        }

        const status: HostStatus = {
            reachable: false,
            latency: -1,
            checking: true,
        }
        this.cache.set(key, status)

        const start = Date.now()

        return new Promise<HostStatus>((resolve) => {
            const socket = new net.Socket()
            socket.setTimeout(timeout)

            const finish = (reachable: boolean, latency: number) => {
                socket.removeAllListeners()
                socket.destroy()
                const result: HostStatus = {
                    reachable,
                    latency,
                    checking: false,
                    lastChecked: new Date(),
                }
                this.cache.set(key, result)
                resolve(result)
            }

            socket.connect(port, host, () => {
                const latency = Date.now() - start
                finish(true, latency)
            })

            socket.on('error', () => {
                finish(false, -1)
            })

            socket.on('timeout', () => {
                finish(false, -1)
            })
        })
    }

    getStatus (host: string, port = 22): HostStatus | undefined {
        return this.cache.get(`${host}:${port}`)
    }
}
