import { Injectable } from '@angular/core'
import { exec } from 'child_process'

export interface ContainerInfo {
    id: string
    name: string
    status: string
    image: string
}

@Injectable({ providedIn: 'root' })
export class DockerService {
    async getContainers (): Promise<ContainerInfo[]> {
        return new Promise((resolve) => {
            exec('docker ps --format "{{.ID}}|{{.Names}}|{{.Status}}|{{.Image}}"', { timeout: 3000 }, (err, stdout) => {
                if (err || !stdout.trim()) {
                    resolve([])
                    return
                }

                const lines = stdout.trim().split('\n')
                const containers: ContainerInfo[] = []
                for (const line of lines) {
                    const parts = line.split('|')
                    if (parts.length >= 4) {
                        containers.push({
                            id: parts[0].trim(),
                            name: parts[1].trim(),
                            status: parts[2].trim(),
                            image: parts[3].trim(),
                        })
                    }
                }
                resolve(containers)
            })
        })
    }
}
