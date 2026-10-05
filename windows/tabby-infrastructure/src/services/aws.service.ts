import { Injectable } from '@angular/core'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { exec } from 'child_process'

export interface EC2Instance {
    instanceId: string
    name: string
    state: 'running' | 'stopped' | 'stopping' | 'pending' | 'shutting-down' | 'terminated' | string
    instanceType: string
    privateIp?: string
    publicIp?: string
    az?: string
    profile: string
    isActing?: boolean
    actingAction?: string
}

export interface S3Bucket {
    name: string
    creationDate?: string
}

export interface EKSCluster {
    name: string
    status?: string
}

export interface ECSCluster {
    name: string
    status?: string
}

export interface LambdaFunction {
    name: string
    runtime?: string
}

export interface AwsResources {
    instances: EC2Instance[]
    s3Buckets: S3Bucket[]
    eksClusters: EKSCluster[]
    ecsClusters: ECSCluster[]
    lambdas: LambdaFunction[]
}

@Injectable({ providedIn: 'root' })
export class AwsService {
    getProfiles (): string[] {
        const foundProfiles = new Set<string>()
        const candidates = [
            path.join('/mnt/c/Users/vibis/.aws/credentials'),
            path.join(process.env.USERPROFILE || '', '.aws/credentials'),
            path.join(os.homedir(), '.aws/credentials'),
            path.join('/root/.aws/credentials'),
        ]

        for (const file of candidates) {
            try {
                if (file && fs.existsSync(file)) {
                    const content = fs.readFileSync(file, 'utf-8')
                    const lines = content.split('\n')
                    for (const line of lines) {
                        const m = line.trim().match(/^\[([^\]]+)\]/)
                        if (m && m[1]) {
                            foundProfiles.add(m[1].replace(/^profile\s+/i, ''))
                        }
                    }
                }
            } catch (e) {
                console.warn('[tabby-infrastructure] Could not read credentials file:', file, e)
            }
        }

        const list = Array.from(foundProfiles)
        return list.length > 0 ? list : ['default']
    }

    async describeInstances (profile = 'default'): Promise<EC2Instance[]> {
        return new Promise((resolve) => {
            const cmd = `aws ec2 describe-instances --profile ${profile} --output json`
            exec(cmd, { maxBuffer: 15 * 1024 * 1024 }, (err, stdout) => {
                if (err) {
                    console.error('[tabby-infrastructure] Error describe-instances:', err)
                    resolve([])
                    return
                }

                try {
                    const data = JSON.parse(stdout)
                    const results: EC2Instance[] = []

                    for (const res of data.Reservations || []) {
                        for (const inst of res.Instances || []) {
                            const nameTag = (inst.Tags || []).find((t: any) => t.Key === 'Name')
                            results.push({
                                instanceId: inst.InstanceId,
                                name: nameTag ? nameTag.Value : inst.InstanceId,
                                state: inst.State ? (inst.State.Name || '').toLowerCase() : 'unknown',
                                instanceType: inst.InstanceType || 'unknown',
                                privateIp: inst.PrivateIpAddress,
                                publicIp: inst.PublicIpAddress,
                                az: inst.Placement ? inst.Placement.AvailabilityZone : '',
                                profile,
                            })
                        }
                    }
                    resolve(results)
                } catch (pe) {
                    console.error('[tabby-infrastructure] JSON parse error describe-instances:', pe)
                    resolve([])
                }
            })
        })
    }

    async describeSingleInstance (instanceId: string, profile = 'default'): Promise<EC2Instance | null> {
        return new Promise((resolve) => {
            const cmd = `aws ec2 describe-instances --instance-ids ${instanceId} --profile ${profile} --output json`
            exec(cmd, { maxBuffer: 5 * 1024 * 1024 }, (err, stdout) => {
                if (err || !stdout) {
                    console.warn('[tabby-infrastructure] Error describeSingleInstance:', err)
                    resolve(null)
                    return
                }

                try {
                    const data = JSON.parse(stdout)
                    for (const res of data.Reservations || []) {
                        for (const inst of res.Instances || []) {
                            const nameTag = (inst.Tags || []).find((t: any) => t.Key === 'Name')
                            return resolve({
                                instanceId: inst.InstanceId,
                                name: nameTag ? nameTag.Value : inst.InstanceId,
                                state: inst.State ? (inst.State.Name || '').toLowerCase() : 'unknown',
                                instanceType: inst.InstanceType || 'unknown',
                                privateIp: inst.PrivateIpAddress,
                                publicIp: inst.PublicIpAddress,
                                az: inst.Placement ? inst.Placement.AvailabilityZone : '',
                                profile,
                            })
                        }
                    }
                    resolve(null)
                } catch (pe) {
                    console.error('[tabby-infrastructure] JSON parse error describeSingleInstance:', pe)
                    resolve(null)
                }
            })
        })
    }

    async describeS3Buckets (profile = 'default'): Promise<S3Bucket[]> {
        return new Promise((resolve) => {
            const cmd = `aws s3api list-buckets --profile ${profile} --output json`
            exec(cmd, { maxBuffer: 10 * 1024 * 1024 }, (err, stdout) => {
                if (err) {
                    resolve([])
                    return
                }
                try {
                    const data = JSON.parse(stdout)
                    const buckets: S3Bucket[] = (data.Buckets || []).map((b: any) => ({
                        name: b.Name,
                        creationDate: b.CreationDate ? b.CreationDate.split('T')[0] : '',
                    }))
                    resolve(buckets)
                } catch {
                    resolve([])
                }
            })
        })
    }

    async describeEKS (profile = 'default'): Promise<EKSCluster[]> {
        return new Promise((resolve) => {
            const cmd = `aws eks list-clusters --profile ${profile} --output json`
            exec(cmd, { maxBuffer: 5 * 1024 * 1024 }, (err, stdout) => {
                if (err) {
                    resolve([])
                    return
                }
                try {
                    const data = JSON.parse(stdout)
                    const clusters: EKSCluster[] = (data.clusters || []).map((c: string) => ({
                        name: c,
                        status: 'ACTIVE',
                    }))
                    resolve(clusters)
                } catch {
                    resolve([])
                }
            })
        })
    }

    async describeECS (profile = 'default'): Promise<ECSCluster[]> {
        return new Promise((resolve) => {
            const cmd = `aws ecs list-clusters --profile ${profile} --output json`
            exec(cmd, { maxBuffer: 5 * 1024 * 1024 }, (err, stdout) => {
                if (err) {
                    resolve([])
                    return
                }
                try {
                    const data = JSON.parse(stdout)
                    const clusters: ECSCluster[] = (data.clusterArns || []).map((arn: string) => ({
                        name: arn.split('/').pop() || arn,
                        status: 'ACTIVE',
                    }))
                    resolve(clusters)
                } catch {
                    resolve([])
                }
            })
        })
    }

    async describeLambdas (profile = 'default'): Promise<LambdaFunction[]> {
        return new Promise((resolve) => {
            const cmd = `aws lambda list-functions --profile ${profile} --output json`
            exec(cmd, { maxBuffer: 10 * 1024 * 1024 }, (err, stdout) => {
                if (err) {
                    resolve([])
                    return
                }
                try {
                    const data = JSON.parse(stdout)
                    const fns: LambdaFunction[] = (data.Functions || []).map((f: any) => ({
                        name: f.FunctionName,
                        runtime: f.Runtime || 'function',
                    }))
                    resolve(fns)
                } catch {
                    resolve([])
                }
            })
        })
    }

    async fetchAllResources (profile = 'default'): Promise<AwsResources> {
        const [instances, s3Buckets, eksClusters, ecsClusters, lambdas] = await Promise.all([
            this.describeInstances(profile),
            this.describeS3Buckets(profile),
            this.describeEKS(profile),
            this.describeECS(profile),
            this.describeLambdas(profile),
        ])

        return {
            instances,
            s3Buckets,
            eksClusters,
            ecsClusters,
            lambdas,
        }
    }

    async startInstance (instanceId: string, profile = 'default'): Promise<boolean> {
        return new Promise((resolve) => {
            const cmd = `aws ec2 start-instances --instance-ids ${instanceId} --profile ${profile}`
            exec(cmd, (err) => {
                resolve(!err)
            })
        })
    }

    async stopInstance (instanceId: string, profile = 'default'): Promise<boolean> {
        return new Promise((resolve) => {
            const cmd = `aws ec2 stop-instances --instance-ids ${instanceId} --profile ${profile}`
            exec(cmd, (err) => {
                resolve(!err)
            })
        })
    }

    async rebootInstance (instanceId: string, profile = 'default'): Promise<boolean> {
        return new Promise((resolve) => {
            const cmd = `aws ec2 reboot-instances --instance-ids ${instanceId} --profile ${profile}`
            exec(cmd, (err) => {
                resolve(!err)
            })
        })
    }
}
