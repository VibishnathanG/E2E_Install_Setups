import { Component, Injector, OnInit, OnDestroy, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core'
import { BaseTabComponent, ProfilesService, PartialProfile, Profile, NotificationsService, ConfigService, AppService } from 'tabby-core'
import { PingService, HostStatus } from '../services/ping.service'
import { AwsService, EC2Instance, S3Bucket, EKSCluster, ECSCluster, LambdaFunction, AwsResources } from '../services/aws.service'
import { AzureService, AzureVM, AzureSubscription } from '../services/azure.service'
import { GcpService, GcpInstance, GcpProject } from '../services/gcp.service'
import { DockerService, ContainerInfo } from '../services/docker.service'
import { ensureHubIsFirst } from '../index'

export interface ConnectionItem {
    id: string
    name: string
    subtitle: string
    category: 'local' | 'wsl' | 'ssh' | 'cloud' | 'azure' | 'gcp'
    iconType: string
    badge?: string
    badgeClass?: string
    host?: string
    port?: number
    user?: string
    status: 'online' | 'offline' | 'checking' | 'local'
    latency?: number
    isCustom?: boolean
    profile?: PartialProfile<Profile>
    ec2?: EC2Instance
    azureVm?: AzureVM
    gcpInst?: GcpInstance
    children?: {
        name: string
        subtitle: string
        iconType: string
        command: string
        statusDot?: string
    }[]
}

export interface CategorySection {
    id: string
    title: string
    iconType: string
    badge: string
    collapsed: boolean
    items: ConnectionItem[]
}

@Component({
    selector: 'infrastructure-dashboard-tab',
    template: `
        <div class="hub-container">
            <!-- Left Navigation Sidebar -->
            <div class="hub-sidebar">
                <div class="sidebar-header">
                    <div class="header-brand">
                        <svg class="brand-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="2" y="2" width="20" height="8" rx="2" ry="2"/>
                            <rect x="2" y="14" width="20" height="8" rx="2" ry="2"/>
                            <line x1="6" y1="6" x2="6.01" y2="6"/>
                            <line x1="6" y1="18" x2="6.01" y2="18"/>
                        </svg>
                        <span class="brand-name">Infrastructure</span>
                        <span class="count-pill">{{ totalConnections }}</span>
                    </div>
                    <button class="btn-icon" (click)="refreshAll($event)" title="Refresh all resources">
                        <svg class="icon-svg" [class.spinning]="isRefreshing" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
                        </svg>
                    </button>
                </div>

                <div class="new-conn-bar">
                    <button class="btn-new-conn" (click)="openNewModal($event)">
                        <svg class="btn-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                            <line x1="12" y1="5" x2="12" y2="19"/>
                            <line x1="5" y1="12" x2="19" y2="12"/>
                        </svg>
                        <span>New Connection</span>
                    </button>
                </div>

                <div class="filter-list">
                    <div class="filter-item" [class.active]="selectedCategory === 'all'" (click)="setCategory('all', $event)">
                        <svg class="nav-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>
                        <span class="filter-label">All Connections</span>
                        <span class="filter-count">{{ totalConnections }}</span>
                    </div>
                    <div class="filter-item" [class.active]="selectedCategory === 'local'" (click)="setCategory('local', $event)">
                        <svg class="nav-svg icon-win" viewBox="0 0 24 24" fill="currentColor"><path d="M3 5.55L10.45 4.5v6.95H3V5.55zm0 12.9l7.45 1.05v-6.95H3v5.9zm8.55 1.2L21 21V11.45h-9.45v8.2zM21 3l-9.45 1.35V11.45H21V3z"/></svg>
                        <span class="filter-label">Local Shells</span>
                        <span class="filter-count">{{ categoryCounts['local'] || 0 }}</span>
                    </div>
                    <div class="filter-item" [class.active]="selectedCategory === 'wsl'" (click)="setCategory('wsl', $event)">
                        <svg class="nav-svg icon-ubuntu" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="7" r="1.5" fill="currentColor"/><circle cx="7.5" cy="14.5" r="1.5" fill="currentColor"/><circle cx="16.5" cy="14.5" r="1.5" fill="currentColor"/></svg>
                        <span class="filter-label">WSL Distros</span>
                        <span class="filter-count">{{ categoryCounts['wsl'] || 0 }}</span>
                    </div>
                    <div class="filter-item" [class.active]="selectedCategory === 'ssh'" (click)="setCategory('ssh', $event)">
                        <svg class="nav-svg icon-ssh" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                        <span class="filter-label">SSH Remote</span>
                        <span class="filter-count">{{ categoryCounts['ssh'] || 0 }}</span>
                    </div>
                    <div class="filter-item" [class.active]="selectedCategory === 'cloud'" (click)="setCategory('cloud', $event)">
                        <svg class="nav-svg icon-aws" viewBox="0 0 24 24" fill="currentColor"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/></svg>
                        <span class="filter-label">AWS Cloud</span>
                        <span class="filter-count">{{ categoryCounts['cloud'] || 0 }}</span>
                    </div>
                    <div class="filter-item" [class.active]="selectedCategory === 'azure'" (click)="setCategory('azure', $event)">
                        <svg class="nav-svg icon-azure" viewBox="0 0 24 24" fill="currentColor"><path d="M13.05 4.24l-6.2 11.23h4.94l3.77-6.85 4.98 11.14H24L13.05 4.24zM5.53 16.71L2.4 20h8.31l1.79-3.29H5.53z"/></svg>
                        <span class="filter-label">Azure Cloud</span>
                        <span class="filter-count">{{ categoryCounts['azure'] || 0 }}</span>
                    </div>
                    <div class="filter-item" [class.active]="selectedCategory === 'gcp'" (click)="setCategory('gcp', $event)">
                        <svg class="nav-svg icon-gcp" viewBox="0 0 24 24" fill="currentColor"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/></svg>
                        <span class="filter-label">Google Cloud</span>
                        <span class="filter-count">{{ categoryCounts['gcp'] || 0 }}</span>
                    </div>
                </div>

                <div class="sidebar-status-panel">
                    <div class="status-summary-item">
                        <span class="dot dot-green"></span>
                        <span>{{ onlineCount }} active / reachable</span>
                    </div>
                    <div class="status-summary-item" *ngIf="offlineCount > 0">
                        <span class="dot dot-red"></span>
                        <span>{{ offlineCount }} stopped / offline</span>
                    </div>
                    <div class="status-summary-item hidden-toggle" (click)="toggleShowHidden($event)">
                        <svg class="eye-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                        </svg>
                        <span>{{ showHidden ? 'Hide hidden items' : 'Show hidden (' + hiddenItemIds.size + ')' }}</span>
                    </div>
                </div>
            </div>

            <!-- Main Workspace -->
            <div class="hub-main">
                <!-- Search & Actions Toolbar -->
                <div class="search-toolbar">
                    <div class="search-box">
                        <svg class="search-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                        </svg>
                        <input
                            type="text"
                            class="search-input"
                            placeholder="Filter connections, IP addresses, distros, cloud instances..."
                            [value]="searchQuery"
                            (input)="onSearchInput($event)"
                            (keydown)="$event.stopPropagation()"
                        />
                        <button class="clear-btn" *ngIf="searchQuery" (click)="clearSearch($event)">✕</button>
                    </div>

                    <div class="toolbar-right-actions">
                        <!-- Overall Expand / Compact Mode Toggle -->
                        <button class="btn-tool" (click)="toggleViewMode($event)" [title]="isCompactMode ? 'Expand all sections' : 'Compact all sections'">
                            <svg class="btn-tool-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path *ngIf="isCompactMode" d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
                                <path *ngIf="!isCompactMode" d="M4 14h6v6M20 10h-6V4M14 10l7-7M10 14l-7 7"/>
                            </svg>
                            <span>{{ isCompactMode ? 'Expand All' : 'Compact All' }}</span>
                        </button>

                        <!-- AWS Profile Switcher -->
                        <div class="cloud-selector" *ngIf="selectedCategory === 'all' || selectedCategory === 'cloud'">
                            <span class="label-cloud label-aws">AWS Profile:</span>
                            <select class="select-cloud" [value]="selectedAwsProfile" (change)="onAwsProfileChange($event)">
                                <option *ngFor="let p of awsProfiles" [value]="p">{{ p }}</option>
                            </select>
                        </div>

                        <!-- Azure Subscription Switcher -->
                        <div class="cloud-selector" *ngIf="selectedCategory === 'azure'">
                            <span class="label-cloud label-azure">Azure Sub:</span>
                            <select class="select-cloud" [value]="selectedAzureSub" (change)="onAzureSubChange($event)">
                                <option *ngFor="let s of azureSubs" [value]="s.id">{{ s.name }}</option>
                            </select>
                        </div>

                        <!-- GCP Project Switcher -->
                        <div class="cloud-selector" *ngIf="selectedCategory === 'gcp'">
                            <span class="label-cloud label-gcp">GCP Project:</span>
                            <select class="select-cloud" [value]="selectedGcpProject" (change)="onGcpProjectChange($event)">
                                <option *ngFor="let prj of gcpProjects" [value]="prj.projectId">{{ prj.name || prj.projectId }}</option>
                            </select>
                        </div>

                        <!-- Auto-Polling Interval Selector -->
                        <div class="cloud-selector poll-selector" title="Configure background auto-polling interval for all instances">
                            <span class="label-cloud label-poll">
                                <span class="poll-live-dot" *ngIf="pollInterval > 0"></span>
                                ⏱ Auto-Poll:
                            </span>
                            <select class="select-cloud select-poll" [value]="pollInterval" (change)="onPollIntervalChange($event)">
                                <option [value]="0">Off (Manual)</option>
                                <option [value]="10">Every 10s</option>
                                <option [value]="30">Every 30s</option>
                                <option [value]="60">Every 1m</option>
                                <option [value]="300">Every 5m</option>
                            </select>
                        </div>

                        <!-- Poll All Button -->
                        <button class="btn-tool btn-poll-all" (click)="pollAll($event)" [title]="pollInterval > 0 ? 'Poll all instances now (Auto-polling active every ' + pollInterval + 's)' : 'Poll all instances now'">
                            <svg class="btn-tool-svg" [class.spinning]="isRefreshing || isPollingAll" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
                            </svg>
                            <span>{{ isPollingAll ? 'Polling...' : 'Poll All' }}</span>
                        </button>
                    </div>
                </div>

                <!-- Tree Content Scroll Area -->
                <div class="content-scroll">
                    <div
                        class="tree-section"
                        *ngFor="let section of filteredSections; trackBy: trackBySection"
                    >
                        <!-- Section Header -->
                        <div class="section-header" (click)="toggleSection(section, $event)">
                            <svg class="chevron-svg" [class.collapsed]="section.collapsed" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                                <polyline points="6 9 12 15 18 9"/>
                            </svg>
                            
                            <!-- High-Res Section Vector Icon -->
                            <div class="section-icon-wrap" [ngSwitch]="section.iconType">
                                <svg *ngSwitchCase="'windows'" class="sec-svg icon-win" viewBox="0 0 24 24" fill="currentColor"><path d="M3 5.55L10.45 4.5v6.95H3V5.55zm0 12.9l7.45 1.05v-6.95H3v5.9zm8.55 1.2L21 21V11.45h-9.45v8.2zM21 3l-9.45 1.35V11.45H21V3z"/></svg>
                                <svg *ngSwitchCase="'ubuntu'" class="sec-svg icon-ubuntu" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="7" r="1.5" fill="currentColor"/><circle cx="7.5" cy="14.5" r="1.5" fill="currentColor"/><circle cx="16.5" cy="14.5" r="1.5" fill="currentColor"/></svg>
                                <svg *ngSwitchCase="'ssh'" class="sec-svg icon-ssh" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                                <svg *ngSwitchCase="'aws'" class="sec-svg icon-aws" viewBox="0 0 24 24" fill="currentColor"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/></svg>
                                <svg *ngSwitchCase="'azure'" class="sec-svg icon-azure" viewBox="0 0 24 24" fill="currentColor"><path d="M13.05 4.24l-6.2 11.23h4.94l3.77-6.85 4.98 11.14H24L13.05 4.24zM5.53 16.71L2.4 20h8.31l1.79-3.29H5.53z"/></svg>
                                <svg *ngSwitchCase="'gcp'" class="sec-svg icon-gcp" viewBox="0 0 24 24" fill="currentColor"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/></svg>
                            </div>

                            <span class="section-title">{{ section.title }}</span>
                            <span class="section-badge">{{ section.badge }}</span>
                            <span class="section-count">{{ section.items.length }}</span>
                        </div>

                        <!-- Section Body -->
                        <div class="section-body" *ngIf="!section.collapsed">
                            <!-- AWS Resource Filter Subtabs -->
                            <div class="aws-subnav" *ngIf="section.id === 'cloud'">
                                <button class="subnav-tab" [class.active]="awsResourceTab === 'all'" (click)="setAwsTab('all', $event)">
                                    All ({{ ec2Instances.length + awsResources.s3Buckets.length + awsResources.eksClusters.length + awsResources.ecsClusters.length + awsResources.lambdas.length }})
                                </button>
                                <button class="subnav-tab" [class.active]="awsResourceTab === 'ec2'" (click)="setAwsTab('ec2', $event)">
                                    EC2 ({{ ec2Instances.length }})
                                </button>
                                <button class="subnav-tab" [class.active]="awsResourceTab === 's3'" (click)="setAwsTab('s3', $event)">
                                    S3 ({{ awsResources.s3Buckets.length }})
                                </button>
                                <button class="subnav-tab" [class.active]="awsResourceTab === 'eks'" (click)="setAwsTab('eks', $event)">
                                    EKS ({{ awsResources.eksClusters.length }})
                                </button>
                                <button class="subnav-tab" [class.active]="awsResourceTab === 'ecs'" (click)="setAwsTab('ecs', $event)">
                                    ECS ({{ awsResources.ecsClusters.length }})
                                </button>
                                <button class="subnav-tab" [class.active]="awsResourceTab === 'lambda'" (click)="setAwsTab('lambda', $event)">
                                    Lambda ({{ awsResources.lambdas.length }})
                                </button>
                            </div>

                            <!-- Connection Rows -->
                            <ng-container *ngIf="section.id !== 'cloud' || (awsResourceTab === 'all' || awsResourceTab === 'ec2')">
                                <div
                                    class="node-wrapper"
                                    *ngFor="let item of section.items; trackBy: trackByItem"
                                    [class.is-hidden-node]="isItemHidden(item.id)"
                                >
                                    <div class="connection-row" (dblclick)="launch(item, $event)">
                                        <div class="row-left">
                                            <!-- Status Dot -->
                                            <span class="status-dot" [ngClass]="'status-' + item.status" [title]="getStatusTooltip(item)"></span>

                                            <!-- High-Res Vector Node Icon Box -->
                                            <div class="node-icon-box" [ngSwitch]="item.iconType">
                                                <svg *ngSwitchCase="'windows'" class="node-svg icon-win" viewBox="0 0 24 24" fill="currentColor"><path d="M3 5.55L10.45 4.5v6.95H3V5.55zm0 12.9l7.45 1.05v-6.95H3v5.9zm8.55 1.2L21 21V11.45h-9.45v8.2zM21 3l-9.45 1.35V11.45H21V3z"/></svg>
                                                <svg *ngSwitchCase="'ubuntu'" class="node-svg icon-ubuntu" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="7" r="1.5" fill="currentColor"/><circle cx="7.5" cy="14.5" r="1.5" fill="currentColor"/><circle cx="16.5" cy="14.5" r="1.5" fill="currentColor"/></svg>
                                                <svg *ngSwitchCase="'ssh'" class="node-svg icon-ssh" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                                                <svg *ngSwitchCase="'aws'" class="node-svg icon-aws" viewBox="0 0 24 24" fill="currentColor"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/></svg>
                                                <svg *ngSwitchCase="'azure'" class="node-svg icon-azure" viewBox="0 0 24 24" fill="currentColor"><path d="M13.05 4.24l-6.2 11.23h4.94l3.77-6.85 4.98 11.14H24L13.05 4.24zM5.53 16.71L2.4 20h8.31l1.79-3.29H5.53z"/></svg>
                                                <svg *ngSwitchCase="'gcp'" class="node-svg icon-gcp" viewBox="0 0 24 24" fill="currentColor"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/></svg>
                                                <svg *ngSwitchDefault class="node-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>
                                            </div>

                                            <!-- Details -->
                                            <div class="node-details">
                                                <div class="node-title-line">
                                                    <span class="node-name">{{ item.name }}</span>
                                                    <span class="node-badge" *ngIf="item.badge" [ngClass]="item.badgeClass">{{ item.badge }}</span>
                                                    <span class="hidden-label" *ngIf="isItemHidden(item.id)">hidden</span>
                                                </div>

                                                <div class="node-subtitle-row">
                                                    <span class="node-subtitle">{{ item.subtitle }}</span>

                                                    <!-- AWS Public IP Chip -->
                                                    <span
                                                        class="copy-chip ip-chip"
                                                        *ngIf="item.ec2 && item.ec2.publicIp"
                                                        (click)="copyToClipboard(item.ec2.publicIp, 'Public IP', $event)"
                                                        title="Click to copy Public IP"
                                                    >
                                                        Public: <strong>{{ item.ec2.publicIp }}</strong>
                                                        <span class="copy-status">{{ copiedTarget === item.ec2.publicIp ? '✓ Copied' : '📋' }}</span>
                                                    </span>

                                                    <!-- AWS Instance ID Chip -->
                                                    <span
                                                        class="copy-chip id-chip"
                                                        *ngIf="item.ec2"
                                                        (click)="copyToClipboard(item.ec2.instanceId, 'Instance ID', $event)"
                                                        title="Click to copy Instance ID"
                                                    >
                                                        ID: <strong>{{ item.ec2.instanceId }}</strong>
                                                        <span class="copy-status">{{ copiedTarget === item.ec2.instanceId ? '✓ Copied' : '📋' }}</span>
                                                    </span>

                                                    <!-- Azure VM Public IP Chip -->
                                                    <span
                                                        class="copy-chip ip-chip"
                                                        *ngIf="item.azureVm && item.azureVm.publicIp"
                                                        (click)="copyToClipboard(item.azureVm.publicIp, 'Public IP', $event)"
                                                        title="Click to copy Public IP"
                                                    >
                                                        Public: <strong>{{ item.azureVm.publicIp }}</strong>
                                                        <span class="copy-status">{{ copiedTarget === item.azureVm.publicIp ? '✓ Copied' : '📋' }}</span>
                                                    </span>

                                                    <!-- GCP Public IP Chip -->
                                                    <span
                                                        class="copy-chip ip-chip"
                                                        *ngIf="item.gcpInst && item.gcpInst.publicIp"
                                                        (click)="copyToClipboard(item.gcpInst.publicIp, 'Public IP', $event)"
                                                        title="Click to copy Public IP"
                                                    >
                                                        Public: <strong>{{ item.gcpInst.publicIp }}</strong>
                                                        <span class="copy-status">{{ copiedTarget === item.gcpInst.publicIp ? '✓ Copied' : '📋' }}</span>
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div class="row-right">
                                            <!-- Latency Chip -->
                                            <div class="latency-chip" *ngIf="item.status === 'online' && item.latency !== undefined">
                                                <span>{{ item.latency }}ms</span>
                                            </div>
                                            <div class="checking-chip" *ngIf="item.status === 'checking'">
                                                <span>probing...</span>
                                            </div>

                                            <!-- AWS EC2 Controls: Always Start+Restart if stopped, Stop+Restart if running -->
                                            <div class="ec2-controls" *ngIf="item.ec2">
                                                <ng-container *ngIf="item.ec2.state?.toLowerCase() === 'stopped'">
                                                    <button class="btn-ec2-action btn-start" [disabled]="item.ec2.isActing" (click)="startEC2(item.ec2, $event)">
                                                        <span>{{ item.ec2.isActing ? 'Starting...' : '▶ Start' }}</span>
                                                    </button>
                                                    <button class="btn-ec2-action btn-reboot" [disabled]="item.ec2.isActing" (click)="startEC2(item.ec2, $event)">
                                                        <span>⟳ Restart</span>
                                                    </button>
                                                </ng-container>

                                                <ng-container *ngIf="item.ec2.state?.toLowerCase() === 'running'">
                                                    <button class="btn-ec2-action btn-stop" [disabled]="item.ec2.isActing" (click)="stopEC2(item.ec2, $event)">
                                                        <span>{{ item.ec2.isActing ? 'Stopping...' : '⏹ Stop' }}</span>
                                                    </button>
                                                    <button class="btn-ec2-action btn-reboot" [disabled]="item.ec2.isActing" (click)="rebootEC2(item.ec2, $event)">
                                                        <span>{{ item.ec2.isActing ? 'Restarting...' : '⟳ Restart' }}</span>
                                                    </button>
                                                </ng-container>
                                            </div>

                                            <!-- Azure VM Controls: Always Start+Restart if stopped, Stop+Restart if running -->
                                            <div class="ec2-controls" *ngIf="item.azureVm">
                                                <ng-container *ngIf="item.azureVm.state?.toLowerCase() === 'stopped'">
                                                    <button class="btn-ec2-action btn-start" [disabled]="item.azureVm.isActing" (click)="startAzureVM(item.azureVm, $event)">
                                                        <span>{{ item.azureVm.isActing ? 'Starting...' : '▶ Start' }}</span>
                                                    </button>
                                                    <button class="btn-ec2-action btn-reboot" [disabled]="item.azureVm.isActing" (click)="startAzureVM(item.azureVm, $event)">
                                                        <span>⟳ Restart</span>
                                                    </button>
                                                </ng-container>

                                                <ng-container *ngIf="item.azureVm.state?.toLowerCase() === 'running'">
                                                    <button class="btn-ec2-action btn-stop" [disabled]="item.azureVm.isActing" (click)="stopAzureVM(item.azureVm, $event)">
                                                        <span>{{ item.azureVm.isActing ? 'Stopping...' : '⏹ Stop' }}</span>
                                                    </button>
                                                    <button class="btn-ec2-action btn-reboot" [disabled]="item.azureVm.isActing" (click)="restartAzureVM(item.azureVm, $event)">
                                                        <span>{{ item.azureVm.isActing ? 'Restarting...' : '⟳ Restart' }}</span>
                                                    </button>
                                                </ng-container>
                                            </div>

                                            <!-- GCP Instance Controls: Always Start+Restart if stopped, Stop+Restart if running -->
                                            <div class="ec2-controls" *ngIf="item.gcpInst">
                                                <ng-container *ngIf="item.gcpInst.status?.toUpperCase() !== 'RUNNING'">
                                                    <button class="btn-ec2-action btn-start" [disabled]="item.gcpInst.isActing" (click)="startGcpInstance(item.gcpInst, $event)">
                                                        <span>{{ item.gcpInst.isActing ? 'Starting...' : '▶ Start' }}</span>
                                                    </button>
                                                    <button class="btn-ec2-action btn-reboot" [disabled]="item.gcpInst.isActing" (click)="startGcpInstance(item.gcpInst, $event)">
                                                        <span>⟳ Restart</span>
                                                    </button>
                                                </ng-container>

                                                <ng-container *ngIf="item.gcpInst.status?.toUpperCase() === 'RUNNING'">
                                                    <button class="btn-ec2-action btn-stop" [disabled]="item.gcpInst.isActing" (click)="stopGcpInstance(item.gcpInst, $event)">
                                                        <span>{{ item.gcpInst.isActing ? 'Stopping...' : '⏹ Stop' }}</span>
                                                    </button>
                                                    <button class="btn-ec2-action btn-reboot" [disabled]="item.gcpInst.isActing" (click)="resetGcpInstance(item.gcpInst, $event)">
                                                        <span>{{ item.gcpInst.isActing ? 'Restarting...' : '⟳ Restart' }}</span>
                                                    </button>
                                                </ng-container>
                                            </div>

                                            <!-- Action Launch Buttons -->
                                            <div class="actions">
                                                <!-- Individual Instance Refresh / Poll Button -->
                                                <button
                                                    class="action-btn-sm btn-poll-item"
                                                    [disabled]="isItemPolling(item)"
                                                    (click)="pollSingleItem(item, $event)"
                                                    [title]="'Poll / Refresh status for ' + item.name"
                                                >
                                                    <svg class="action-svg-sm" [class.spinning]="isItemPolling(item)" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                        <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
                                                    </svg>
                                                </button>

                                                <button
                                                    class="action-btn"
                                                    [ngClass]="item.ec2 ? 'btn-ssm' : item.azureVm ? 'btn-azure' : item.gcpInst ? 'btn-gcp' : 'btn-launch'"
                                                    (click)="launch(item, $event)"
                                                    [title]="item.ec2 ? 'Connect via AWS SSM' : item.azureVm ? 'Connect via Azure SSH' : item.gcpInst ? 'Connect via gcloud SSH' : 'Launch Session in Tabby'"
                                                >
                                                    <span>&gt;_ {{ item.ec2 ? 'SSM' : item.azureVm ? 'Azure SSH' : item.gcpInst ? 'gcloud SSH' : 'Launch' }}</span>
                                                </button>

                                                <button
                                                    class="action-btn-sm"
                                                    *ngIf="!isItemHidden(item.id)"
                                                    (click)="hideItem(item.id, $event)"
                                                    title="Hide from dashboard"
                                                >✕</button>
                                                <button
                                                    class="action-btn-sm"
                                                    *ngIf="isItemHidden(item.id)"
                                                    (click)="unhideItem(item.id, $event)"
                                                    title="Unhide on dashboard"
                                                >👁️</button>

                                                <button
                                                    class="action-btn-sm btn-del"
                                                    *ngIf="item.isCustom"
                                                    (click)="deleteProfile(item, $event)"
                                                    title="Delete custom profile"
                                                >🗑️</button>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Sub-items: Docker (Live Monitor / Watch), Kubernetes (k9s / Watch), Python -->
                                    <div class="sub-tree" *ngIf="item.children && item.children.length > 0">
                                        <div
                                            class="sub-node"
                                            *ngFor="let child of item.children; trackBy: trackByChild"
                                            (click)="launchSubTool(item, child, $event)"
                                        >
                                            <div class="sub-left">
                                                <span class="sub-dot" *ngIf="child.statusDot" [ngClass]="child.statusDot"></span>
                                                
                                                <!-- High-Res Vector Sub-Icons -->
                                                <div class="sub-icon-wrap" [ngSwitch]="child.iconType">
                                                    <svg *ngSwitchCase="'docker'" class="sub-svg icon-docker" viewBox="0 0 24 24" fill="currentColor"><path d="M13.98 11.08h-2.12v2.13h2.12v-2.13zm-3.18 0H8.68v2.13h2.12v-2.13zm6.36 0h-2.12v2.13h2.12v-2.13zm-9.54 0H5.5v2.13h2.12v-2.13zm6.36-3.18h-2.12v2.12h2.12V7.9zm-3.18 0H8.68v2.12h2.12V7.9zm6.36 0h-2.12v2.12h2.12V7.9zm-3.18-3.18h-2.12v2.12h2.12V4.72zm9.14 7.63c-.45-.33-1.42-.4-2.15-.24-.13-.77-.55-1.48-1.2-2.02l-.63-.48-.44.66c-.52.78-.66 1.76-.41 2.66-.4.2-.87.35-1.41.43H2.03c-.23 1.14.07 2.3.83 3.23 1.25 1.54 3.19 2.45 5.56 2.45 6.42 0 11.13-3.69 12.44-8.08.76.08 1.55-.07 2.14-.52l.48-.37-.5-.72z"/></svg>
                                                    <svg *ngSwitchCase="'k8s'" class="sub-svg icon-k8s" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L3.5 6.9v9.8L12 21.6l8.5-4.9V6.9L12 2zm0 2.3l6.5 3.8v7.5L12 19.3 5.5 15.6V8.1L12 4.3zm0 4.2a3.5 3.5 0 100 7 3.5 3.5 0 000-7z"/></svg>
                                                    <svg *ngSwitchCase="'python'" class="sub-svg icon-python" viewBox="0 0 24 24" fill="currentColor"><path d="M11.92 2C6.88 2 7.21 4.19 7.21 4.19l.01 2.27h4.8v.68H5.16S2 6.78 2 11.85c0 5.08 2.76 4.89 2.76 4.89h1.65v-2.32s-.09-2.76 2.72-2.76h4.69s2.63.04 2.63-2.58V4.62S16.96 2 11.92 2zm-2.53 1.45a.91.91 0 110 1.82.91.91 0 010-1.82zm2.69 18.55c5.04 0 4.71-2.19 4.71-2.19l-.01-2.27h-4.8v-.68h6.86s3.16.36 3.16-4.71c0-5.08-2.76-4.89-2.76-4.89h-1.65v2.32s.09 2.76-2.72 2.76h-4.69s-2.63-.04-2.63 2.58v4.46s-.51 2.62 4.53 2.62zm2.53-1.45a.91.91 0 110-1.82.91.91 0 010 1.82z"/></svg>
                                                    <svg *ngSwitchDefault class="sub-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>
                                                </div>

                                                <span class="sub-name">{{ child.name }}</span>
                                                <span class="sub-subtitle">{{ child.subtitle }}</span>
                                            </div>
                                            <div class="sub-actions">
                                                <button class="action-btn btn-launch-sm" (click)="launchSubTool(item, child, $event)" title="Execute live monitor in Tabby">
                                                    &gt;_ Run
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </ng-container>

                            <!-- S3 Buckets Sub-section -->
                            <div class="aws-resource-group" *ngIf="section.id === 'cloud' && (awsResourceTab === 'all' || awsResourceTab === 's3')">
                                <div class="resource-group-header" *ngIf="awsResourceTab === 'all'">
                                    <svg class="rg-svg icon-s3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16l-1.5 14h-13L4 6z"/><path d="M3 6a2 2 0 012-2h14a2 2 0 012 2"/></svg>
                                    <span class="rg-title">Amazon S3 Buckets ({{ awsResources.s3Buckets.length }})</span>
                                </div>

                                <div class="resource-row" *ngFor="let bucket of awsResources.s3Buckets">
                                    <div class="res-left">
                                        <div class="node-icon-box">
                                            <svg class="node-svg icon-s3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16l-1.5 14h-13L4 6z"/><path d="M3 6a2 2 0 012-2h14a2 2 0 012 2"/></svg>
                                        </div>
                                        <div class="node-details">
                                            <div class="node-title-line">
                                                <span class="node-name">{{ bucket.name }}</span>
                                                <span class="node-badge badge-s3" *ngIf="bucket.creationDate">Created: {{ bucket.creationDate }}</span>
                                            </div>
                                            <div class="node-subtitle-row">
                                                <span class="copy-chip id-chip" (click)="copyToClipboard('s3://' + bucket.name, 'S3 URI', $event)" title="Click to copy S3 URI">
                                                    s3://{{ bucket.name }}
                                                    <span class="copy-status">{{ copiedTarget === ('s3://' + bucket.name) ? '✓ Copied' : '📋' }}</span>
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="row-right">
                                        <button class="action-btn btn-s3" (click)="launchS3(bucket, $event)" title="Browse bucket in terminal">
                                            &gt;_ Browse S3
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="empty-state" *ngIf="filteredSections.length === 0">
                        <p>No connections match "{{ searchQuery }}".</p>
                    </div>
                </div>
            </div>

            <!-- New Connection Modal (With File Explorer Picker & Password Auth Option) -->
            <div class="modal-backdrop" *ngIf="showNewModal" (click)="closeNewModal($event)">
                <div class="modal-dialog" (click)="$event.stopPropagation()" (mousedown)="$event.stopPropagation()" (keydown)="$event.stopPropagation()">
                    <div class="modal-header">
                        <div class="modal-title-box">
                            <svg class="modal-title-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                            <h3>New Infrastructure Connection</h3>
                        </div>
                        <button class="btn-close" (click)="closeNewModal($event)" title="Close">✕</button>
                    </div>

                    <div class="modal-body">
                        <div class="form-group">
                            <label>Connection Type</label>
                            <select
                                [value]="newConn.type"
                                (change)="newConn.type = $any($event.target).value"
                                class="form-control"
                            >
                                <option value="ssh">SSH Remote Host</option>
                                <option value="local">Local Windows Shell</option>
                                <option value="wsl">WSL Linux Distro</option>
                                <option value="aws">AWS EC2 Instance</option>
                                <option value="azure">Azure Virtual Machine</option>
                                <option value="gcp">GCP Compute Engine</option>
                            </select>
                        </div>

                        <div class="form-group">
                            <label>Display Name</label>
                            <input
                                type="text"
                                [value]="newConn.name"
                                (input)="newConn.name = $any($event.target).value"
                                (keydown.enter)="saveNewConnection()"
                                placeholder="e.g. Production Server / My VM"
                                class="form-control"
                                autofocus
                            />
                        </div>

                        <!-- SSH Configuration Fields -->
                        <ng-container *ngIf="newConn.type === 'ssh'">
                            <div class="form-row">
                                <div class="form-group flex-2">
                                    <label>Host / IP Address</label>
                                    <input
                                        type="text"
                                        [value]="newConn.host"
                                        (input)="newConn.host = $any($event.target).value"
                                        (keydown.enter)="saveNewConnection()"
                                        placeholder="192.168.1.50 or host.domain.com"
                                        class="form-control"
                                    />
                                </div>
                                <div class="form-group flex-1">
                                    <label>Port</label>
                                    <input
                                        type="number"
                                        [value]="newConn.port"
                                        (input)="newConn.port = +$any($event.target).value"
                                        (keydown.enter)="saveNewConnection()"
                                        class="form-control"
                                    />
                                </div>
                            </div>
                            <div class="form-group">
                                <label>Username</label>
                                <input
                                    type="text"
                                    [value]="newConn.user"
                                    (input)="newConn.user = $any($event.target).value"
                                    (keydown.enter)="saveNewConnection()"
                                    placeholder="ubuntu / root / admin"
                                    class="form-control"
                                />
                            </div>

                            <!-- Password Auth Checkbox -->
                            <div class="auth-toggle-row">
                                <label class="checkbox-label">
                                    <input
                                        type="checkbox"
                                        [checked]="newConn.usePassword"
                                        (change)="onTogglePasswordAuth($event)"
                                        class="checkbox-input"
                                    />
                                    <span>Use Password Authentication instead of Key File</span>
                                </label>
                            </div>

                            <!-- Optional Password Input when Password Auth is Checked -->
                            <div class="form-group" *ngIf="newConn.usePassword">
                                <label>Password (Optional)</label>
                                <input
                                    type="password"
                                    [value]="newConn.password"
                                    (input)="newConn.password = $any($event.target).value"
                                    (keydown.enter)="saveNewConnection()"
                                    placeholder="Leave blank to prompt interactively on connect"
                                    class="form-control"
                                />
                            </div>

                            <!-- Private Key Path with Native File Explorer Picker (Disabled if password auth is checked) -->
                            <div class="form-group" [class.is-disabled]="newConn.usePassword">
                                <label>Private Key Path</label>
                                <div class="file-picker-row">
                                    <input
                                        type="text"
                                        [value]="newConn.keyPath"
                                        (input)="newConn.keyPath = $any($event.target).value"
                                        (keydown.enter)="saveNewConnection()"
                                        [disabled]="newConn.usePassword"
                                        placeholder="C:\\Users\\user\\.ssh\\id_rsa"
                                        class="form-control flex-1"
                                    />
                                    <button
                                        type="button"
                                        class="btn-browse"
                                        [disabled]="newConn.usePassword"
                                        (click)="keyFileInput.click()"
                                        title="Pick private key file with File Explorer"
                                    >
                                        <svg class="browse-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
                                        </svg>
                                        <span>Browse...</span>
                                    </button>
                                    <!-- Hidden File Input for Native File Explorer Picker -->
                                    <input
                                        #keyFileInput
                                        type="file"
                                        style="display: none"
                                        (change)="onKeyFileSelected($event)"
                                    />
                                </div>
                            </div>
                        </ng-container>

                        <!-- Local Shell Configuration Fields -->
                        <ng-container *ngIf="newConn.type === 'local'">
                            <div class="form-group">
                                <label>Executable Command</label>
                                <input
                                    type="text"
                                    [value]="newConn.command"
                                    (input)="newConn.command = $any($event.target).value"
                                    (keydown.enter)="saveNewConnection()"
                                    placeholder="powershell.exe / cmd.exe / bash.exe"
                                    class="form-control"
                                />
                            </div>
                        </ng-container>

                        <!-- WSL Configuration Fields -->
                        <ng-container *ngIf="newConn.type === 'wsl'">
                            <div class="form-group">
                                <label>WSL Distribution Name</label>
                                <input
                                    type="text"
                                    [value]="newConn.distro"
                                    (input)="newConn.distro = $any($event.target).value"
                                    (keydown.enter)="saveNewConnection()"
                                    placeholder="WSL-Main-Ubuntu-24.04"
                                    class="form-control"
                                />
                            </div>
                        </ng-container>

                        <!-- AWS EC2 Configuration Fields -->
                        <ng-container *ngIf="newConn.type === 'aws'">
                            <div class="form-group">
                                <label>EC2 Instance ID</label>
                                <input
                                    type="text"
                                    [value]="newConn.awsInstanceId"
                                    (input)="newConn.awsInstanceId = $any($event.target).value"
                                    (keydown.enter)="saveNewConnection()"
                                    placeholder="i-01de9363f25ebfff1"
                                    class="form-control"
                                />
                            </div>
                        </ng-container>

                        <!-- Azure VM Configuration Fields -->
                        <ng-container *ngIf="newConn.type === 'azure'">
                            <div class="form-row">
                                <div class="form-group flex-1">
                                    <label>Resource Group</label>
                                    <input
                                        type="text"
                                        [value]="newConn.azureRg"
                                        (input)="newConn.azureRg = $any($event.target).value"
                                        placeholder="my-resource-group"
                                        class="form-control"
                                    />
                                </div>
                                <div class="form-group flex-1">
                                    <label>VM Name</label>
                                    <input
                                        type="text"
                                        [value]="newConn.azureVmName"
                                        (input)="newConn.azureVmName = $any($event.target).value"
                                        placeholder="my-vm"
                                        class="form-control"
                                    />
                                </div>
                            </div>
                        </ng-container>

                        <!-- GCP Compute Engine Configuration Fields -->
                        <ng-container *ngIf="newConn.type === 'gcp'">
                            <div class="form-row">
                                <div class="form-group flex-1">
                                    <label>GCP Project</label>
                                    <input
                                        type="text"
                                        [value]="newConn.gcpProject"
                                        (input)="newConn.gcpProject = $any($event.target).value"
                                        placeholder="main-project-acc-01"
                                        class="form-control"
                                    />
                                </div>
                                <div class="form-group flex-1">
                                    <label>Zone</label>
                                    <input
                                        type="text"
                                        [value]="newConn.gcpZone"
                                        (input)="newConn.gcpZone = $any($event.target).value"
                                        placeholder="us-central1-a"
                                        class="form-control"
                                    />
                                </div>
                            </div>
                            <div class="form-group">
                                <label>Instance Name</label>
                                <input
                                    type="text"
                                    [value]="newConn.gcpInstName"
                                    (input)="newConn.gcpInstName = $any($event.target).value"
                                    placeholder="instance-1"
                                    class="form-control"
                                />
                            </div>
                        </ng-container>
                    </div>

                    <div class="modal-footer">
                        <button class="btn-secondary" (click)="closeNewModal($event)">Cancel</button>
                        <button class="btn-primary" (click)="saveNewConnection()">Save Connection</button>
                    </div>
                </div>
            </div>
        </div>
    `,
    styles: [`
        :host {
            display: flex;
            flex: 1 1 auto;
            width: 100%;
            height: 100%;
            min-height: 0;
            background-color: #222324;
            color: #bababa;
            font-family: inherit;
            font-size: 15px;
            user-select: none;
            overflow: hidden;
            position: relative;
        }

        .hub-container {
            display: flex;
            width: 100%;
            height: 100%;
            min-height: 0;
            overflow: hidden;
        }

        /* Sidebar */
        .hub-sidebar {
            width: 280px;
            background-color: #1a1b1c;
            border-right: 1px solid rgba(255, 255, 255, 0.08);
            display: flex;
            flex-direction: column;
            flex-shrink: 0;
            min-height: 0;
        }

        .sidebar-header {
            padding: 1.1rem 1.3rem;
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 1px solid rgba(255, 255, 255, 0.06);
            flex-shrink: 0;
        }

        .header-brand {
            display: flex;
            align-items: center;
            gap: 0.65rem;
        }

        .brand-svg {
            width: 20px;
            height: 20px;
            color: #1c98e8;
        }

        .brand-name {
            font-weight: 700;
            font-size: 1.12rem;
            letter-spacing: 0.02em;
            color: #e5e5e5;
        }

        .count-pill {
            background-color: #282a2d;
            color: #1c98e8;
            border: 1px solid rgba(28, 152, 232, 0.35);
            font-size: 0.8rem;
            font-weight: 700;
            padding: 0.12rem 0.55rem;
            border-radius: 12px;
        }

        .new-conn-bar {
            padding: 0.9rem 1.2rem;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            flex-shrink: 0;
        }

        .btn-new-conn {
            width: 100%;
            background-color: #1c98e8;
            color: #ffffff;
            border: none;
            border-radius: 6px;
            padding: 0.6rem 1rem;
            font-size: 0.95rem;
            font-weight: 700;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
            box-shadow: 0 2px 8px rgba(28, 152, 232, 0.3);
            transition: all 0.18s ease;
        }

        .btn-new-conn:hover {
            background-color: #38aefc;
            transform: translateY(-1px);
        }

        .btn-svg {
            width: 16px;
            height: 16px;
        }

        .filter-list {
            padding: 0.8rem 0.7rem;
            display: flex;
            flex-direction: column;
            gap: 0.35rem;
            overflow-y: auto;
            flex: 1 1 auto;
        }

        .filter-item {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding: 0.65rem 0.85rem;
            border-radius: 6px;
            cursor: pointer;
            color: #bababa;
            font-size: 0.95rem;
            transition: all 0.15s ease;
            border-left: 3px solid transparent;
        }

        .filter-item:hover {
            background-color: #282a2d;
            color: #ffffff;
        }

        .filter-item.active {
            background-color: #2b2e33;
            color: #1c98e8;
            font-weight: 600;
            border-left: 3px solid #1c98e8;
        }

        .nav-svg {
            width: 18px;
            height: 18px;
            flex-shrink: 0;
        }

        .filter-label { flex: 1; }
        .filter-count { font-size: 0.85rem; font-weight: 600; color: #888; }

        .sidebar-status-panel {
            padding: 0.9rem 1.2rem;
            border-top: 1px solid rgba(255, 255, 255, 0.06);
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
            font-size: 0.88rem;
            color: #999;
            background-color: #171819;
            flex-shrink: 0;
        }

        .status-summary-item {
            display: flex;
            align-items: center;
            gap: 0.65rem;
        }

        .hidden-toggle {
            cursor: pointer;
            margin-top: 0.2rem;
            color: #1c98e8;
        }

        .eye-svg {
            width: 16px;
            height: 16px;
        }

        .dot {
            width: 9px;
            height: 9px;
            border-radius: 50%;
            flex-shrink: 0;
        }

        /* Main Workspace */
        .hub-main {
            flex: 1 1 auto;
            display: flex;
            flex-direction: column;
            min-width: 0;
            min-height: 0;
            background-color: #222324;
        }

        .search-toolbar {
            padding: 0.9rem 1.4rem;
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 1.2rem;
            background-color: #222324;
            flex-shrink: 0;
        }

        .search-box {
            position: relative;
            flex: 1;
            max-width: 580px;
            display: flex;
            align-items: center;
        }

        .search-svg {
            position: absolute;
            left: 0.9rem;
            width: 18px;
            height: 18px;
            color: #888;
            pointer-events: none;
        }

        .search-input {
            width: 100%;
            height: 42px;
            background-color: #2a2c2e;
            border: 1px solid rgba(255, 255, 255, 0.12);
            border-radius: 6px;
            padding: 0 2.4rem 0 2.6rem;
            color: #ffffff;
            font-size: 0.95rem;
            outline: none;
            transition: all 0.15s ease;
        }

        .search-input:focus {
            border-color: #1c98e8;
            box-shadow: 0 0 0 2px rgba(28, 152, 232, 0.25);
        }

        .clear-btn {
            position: absolute;
            right: 0.75rem;
            background: none;
            border: none;
            color: #888;
            cursor: pointer;
            font-size: 1rem;
        }

        .toolbar-right-actions {
            display: flex;
            align-items: center;
            gap: 0.8rem;
        }

        .cloud-selector {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-size: 0.9rem;
        }

        .label-cloud { font-weight: 600; }
        .label-aws { color: #f97316; }
        .label-azure { color: #1c98e8; }
        .label-gcp { color: #68c256; }
        .label-poll {
            color: #38bdf8;
            display: flex;
            align-items: center;
            gap: 0.35rem;
        }

        .poll-live-dot {
            width: 7px;
            height: 7px;
            border-radius: 50%;
            background-color: #10b981;
            box-shadow: 0 0 6px #10b981;
            animation: pulse-green 1.5s infinite ease-in-out;
            display: inline-block;
        }

        @keyframes pulse-green {
            0%, 100% { transform: scale(0.85); opacity: 0.5; }
            50% { transform: scale(1.3); opacity: 1; }
        }

        .btn-poll-all {
            color: #38bdf8;
            border-color: rgba(56, 189, 248, 0.3);
        }

        .btn-poll-all:hover {
            border-color: #38bdf8;
            background-color: rgba(56, 189, 248, 0.15);
            color: #ffffff;
        }

        .btn-poll-item {
            color: #38bdf8;
            border-color: rgba(56, 189, 248, 0.25);
            padding: 0.35rem 0.5rem;
            display: inline-flex;
            align-items: center;
            justify-content: center;
        }

        .btn-poll-item:hover:not(:disabled) {
            background-color: rgba(56, 189, 248, 0.2);
            border-color: #38bdf8;
            color: #ffffff;
        }

        .btn-poll-item:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        .action-svg-sm {
            width: 14px;
            height: 14px;
        }

        .select-cloud {
            background-color: #2a2c2e;
            border: 1px solid rgba(255, 255, 255, 0.15);
            color: #ffffff;
            border-radius: 5px;
            padding: 0.38rem 0.75rem;
            font-size: 0.9rem;
            outline: none;
            cursor: pointer;
        }

        .btn-tool {
            background-color: #2a2c2e;
            border: 1px solid rgba(255, 255, 255, 0.15);
            color: #ffffff;
            border-radius: 5px;
            padding: 0.45rem 0.85rem;
            font-size: 0.9rem;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 0.45rem;
            transition: all 0.15s ease;
        }

        .btn-tool:hover {
            background-color: #333538;
            border-color: #1c98e8;
            color: #1c98e8;
        }

        .btn-tool-svg {
            width: 16px;
            height: 16px;
        }

        /* Tree Content Scroll */
        .content-scroll {
            flex: 1 1 auto;
            overflow-y: auto;
            padding: 1.2rem 1.4rem;
            display: flex;
            flex-direction: column;
            gap: 1.1rem;
            min-height: 0;
        }

        .tree-section {
            background-color: #25272a;
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
        }

        .section-header {
            display: flex;
            align-items: center;
            padding: 0.85rem 1.2rem;
            background-color: #292b2e;
            border-bottom: 1px solid rgba(255, 255, 255, 0.06);
            cursor: pointer;
            user-select: none;
            transition: background-color 0.15s ease;
        }

        .section-header:hover {
            background-color: #2f3236;
        }

        .chevron-svg {
            width: 16px;
            height: 16px;
            margin-right: 0.8rem;
            color: #1c98e8;
            transition: transform 0.15s ease;
        }

        .chevron-svg.collapsed {
            transform: rotate(-90deg);
        }

        .section-icon-wrap {
            margin-right: 0.75rem;
            display: flex;
            align-items: center;
        }

        .sec-svg {
            width: 20px;
            height: 20px;
        }

        .section-title {
            font-weight: 700;
            font-size: 1.05rem;
            color: #ffffff;
        }

        .section-badge {
            margin-left: 0.9rem;
            background-color: rgba(28, 152, 232, 0.15);
            border: 1px solid rgba(28, 152, 232, 0.35);
            border-radius: 4px;
            padding: 0.15rem 0.55rem;
            font-size: 0.78rem;
            font-weight: 600;
            color: #1c98e8;
        }

        .section-count {
            margin-left: auto;
            font-size: 0.85rem;
            font-weight: 600;
            color: #888;
        }

        /* AWS Subnav */
        .aws-subnav {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.6rem 1.2rem;
            background-color: #1d1e20;
            border-bottom: 1px solid rgba(255, 255, 255, 0.06);
            overflow-x: auto;
        }

        .subnav-tab {
            background-color: #2a2c2e;
            border: 1px solid rgba(255, 255, 255, 0.1);
            color: #bbb;
            border-radius: 5px;
            padding: 0.35rem 0.75rem;
            font-size: 0.85rem;
            font-weight: 600;
            cursor: pointer;
            white-space: nowrap;
            transition: all 0.15s ease;
        }

        .subnav-tab:hover {
            background-color: #333538;
            color: #fff;
        }

        .subnav-tab.active {
            background-color: #1c98e8;
            color: #ffffff;
            border-color: #1c98e8;
            font-weight: 700;
        }

        /* Connection Rows */
        .node-wrapper.is-hidden-node {
            opacity: 0.45;
            filter: grayscale(0.6);
        }

        .connection-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0.85rem 1.2rem;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            transition: background-color 0.15s ease;
            cursor: pointer;
        }

        .connection-row:hover {
            background-color: #2c2e32;
        }

        .row-left {
            display: flex;
            align-items: center;
            gap: 0.95rem;
            min-width: 0;
            flex: 1;
        }

        .status-dot {
            width: 10px;
            height: 10px;
            border-radius: 50%;
            flex-shrink: 0;
        }

        .status-online, .dot-green {
            background-color: #68c256;
            box-shadow: 0 0 10px rgba(104, 194, 86, 0.7);
        }

        .status-offline, .dot-red {
            background-color: #e8341c;
            box-shadow: 0 0 8px rgba(232, 52, 28, 0.7);
        }

        .status-checking {
            background-color: #f2d42c;
            box-shadow: 0 0 8px rgba(242, 212, 44, 0.7);
        }

        .status-local {
            background-color: #1c98e8;
        }

        .node-icon-box {
            width: 38px;
            height: 38px;
            border-radius: 7px;
            background-color: #2c2e32;
            border: 1px solid rgba(255, 255, 255, 0.1);
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
        }

        .node-svg {
            width: 20px;
            height: 20px;
        }

        .icon-win { color: #38bdf8; }
        .icon-ubuntu { color: #f97316; }
        .icon-ssh { color: #f2d42c; }
        .icon-aws { color: #fb923c; }
        .icon-azure { color: #38bdf8; }
        .icon-gcp { color: #68c256; }
        .icon-docker { color: #06b6d4; }
        .icon-k8s { color: #8b5cf6; }
        .icon-python { color: #eab308; }
        .icon-s3 { color: #f59e0b; }

        .node-details {
            display: flex;
            flex-direction: column;
            gap: 0.25rem;
            min-width: 0;
            flex: 1;
        }

        .node-title-line {
            display: flex;
            align-items: center;
            gap: 0.7rem;
            flex-wrap: wrap;
        }

        .node-name {
            font-weight: 600;
            font-size: 1.02rem;
            color: #ffffff;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .node-badge {
            background-color: rgba(28, 152, 232, 0.2);
            color: #1c98e8;
            border: 1px solid rgba(28, 152, 232, 0.35);
            border-radius: 4px;
            padding: 0.15rem 0.5rem;
            font-size: 0.76rem;
            font-weight: 600;
        }

        .badge-distro {
            background-color: rgba(249, 115, 22, 0.2);
            color: #f97316;
            border-color: rgba(249, 115, 22, 0.4);
        }

        .badge-online {
            background-color: rgba(104, 194, 86, 0.2);
            color: #68c256;
            border-color: rgba(104, 194, 86, 0.4);
        }

        .badge-offline {
            background-color: rgba(232, 52, 28, 0.2);
            color: #e8341c;
            border-color: rgba(232, 52, 28, 0.4);
        }

        .badge-s3 {
            background-color: rgba(242, 212, 44, 0.2);
            color: #f2d42c;
            border-color: rgba(242, 212, 44, 0.4);
        }

        .hidden-label {
            font-size: 0.7rem;
            background-color: rgba(242, 212, 44, 0.2);
            color: #f2d42c;
            border-radius: 3px;
            padding: 0.1rem 0.35rem;
        }

        .node-subtitle-row {
            display: flex;
            align-items: center;
            gap: 0.7rem;
            flex-wrap: wrap;
        }

        .node-subtitle {
            font-size: 0.85rem;
            color: #888;
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        }

        /* Copy Chips */
        .copy-chip {
            display: inline-flex;
            align-items: center;
            gap: 0.35rem;
            padding: 0.15rem 0.55rem;
            border-radius: 4px;
            font-size: 0.8rem;
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
            cursor: pointer;
            transition: all 0.15s ease;
        }

        .ip-chip {
            background-color: rgba(104, 194, 86, 0.15);
            border: 1px solid rgba(104, 194, 86, 0.4);
            color: #68c256;
        }
        .ip-chip:hover { background-color: rgba(104, 194, 86, 0.25); }

        .id-chip {
            background-color: rgba(28, 152, 232, 0.15);
            border: 1px solid rgba(28, 152, 232, 0.4);
            color: #1c98e8;
        }
        .id-chip:hover { background-color: rgba(28, 152, 232, 0.25); }

        .copy-status { font-size: 0.78rem; font-weight: 700; }

        .row-right {
            display: flex;
            align-items: center;
            gap: 0.7rem;
            flex-shrink: 0;
            margin-left: 1rem;
        }

        .latency-chip {
            background-color: rgba(104, 194, 86, 0.18);
            color: #68c256;
            border: 1px solid rgba(104, 194, 86, 0.4);
            border-radius: 12px;
            padding: 0.15rem 0.55rem;
            font-size: 0.8rem;
            font-family: monospace;
            font-weight: 600;
        }

        .checking-chip { font-size: 0.8rem; color: #f2d42c; font-style: italic; }

        .ec2-controls {
            display: flex;
            align-items: center;
            gap: 0.4rem;
        }

        .btn-ec2-action {
            background-color: #2c2e32;
            border: 1px solid rgba(255, 255, 255, 0.15);
            color: #ffffff;
            border-radius: 5px;
            padding: 0.35rem 0.65rem;
            font-size: 0.82rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.15s;
        }

        .btn-ec2-action:hover:not(:disabled) {
            background-color: #383a3f;
        }

        .btn-start {
            border-color: rgba(104, 194, 86, 0.5);
            color: #68c256;
        }

        .btn-stop {
            border-color: rgba(232, 52, 28, 0.5);
            color: #e8341c;
        }

        .btn-reboot {
            border-color: rgba(28, 152, 232, 0.5);
            color: #1c98e8;
        }

        .actions {
            display: flex;
            align-items: center;
            gap: 0.45rem;
        }

        .action-btn {
            background-color: #2c2e32;
            border: 1px solid rgba(255, 255, 255, 0.15);
            color: #ffffff;
            border-radius: 5px;
            padding: 0.45rem 0.85rem;
            font-size: 0.88rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.15s;
            display: inline-flex;
            align-items: center;
        }

        .btn-launch:hover {
            background-color: #1c98e8;
            color: #ffffff;
            border-color: #1c98e8;
        }

        .btn-ssm {
            background-color: rgba(249, 115, 22, 0.15);
            border-color: rgba(249, 115, 22, 0.4);
            color: #f97316;
        }

        .btn-ssm:hover {
            background-color: #f97316;
            color: #ffffff;
        }

        .btn-azure {
            background-color: rgba(28, 152, 232, 0.15);
            border-color: rgba(28, 152, 232, 0.4);
            color: #1c98e8;
        }

        .btn-azure:hover {
            background-color: #1c98e8;
            color: #ffffff;
        }

        .btn-gcp {
            background-color: rgba(104, 194, 86, 0.15);
            border-color: rgba(104, 194, 86, 0.4);
            color: #68c256;
        }

        .btn-gcp:hover {
            background-color: #68c256;
            color: #ffffff;
        }

        .btn-s3 {
            background-color: rgba(242, 212, 44, 0.15);
            border-color: rgba(242, 212, 44, 0.4);
            color: #f2d42c;
        }

        .btn-s3:hover {
            background-color: #f2d42c;
            color: #1a1b1c;
        }

        .action-btn-sm {
            background: none;
            border: 1px solid rgba(255, 255, 255, 0.12);
            color: #888;
            border-radius: 4px;
            padding: 0.35rem 0.55rem;
            font-size: 0.8rem;
            cursor: pointer;
            transition: all 0.15s;
        }

        .action-btn-sm:hover {
            color: #ffffff;
            border-color: #1c98e8;
        }

        .btn-del:hover {
            color: #e8341c;
            border-color: #e8341c;
        }

        .btn-icon {
            padding: 0.4rem 0.6rem;
            background: none;
            border: none;
            color: #888;
            cursor: pointer;
        }

        .btn-icon:hover { color: #ffffff; }

        .icon-svg {
            width: 18px;
            height: 18px;
        }

        .icon-svg.spinning, .spinning {
            display: inline-block;
            animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
            100% { transform: rotate(360deg); }
        }

        /* Sub-Tree */
        .sub-tree {
            padding-left: 4.2rem;
            background-color: #1d1e20;
            border-top: 1px solid rgba(255, 255, 255, 0.05);
        }

        .sub-node {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0.55rem 1.2rem 0.55rem 0;
            border-bottom: 1px solid rgba(255, 255, 255, 0.03);
            font-size: 0.88rem;
            cursor: pointer;
        }

        .sub-node:hover {
            background-color: rgba(28, 152, 232, 0.05);
        }

        .sub-node:last-child {
            border-bottom: none;
        }

        .sub-left {
            display: flex;
            align-items: center;
            gap: 0.65rem;
        }

        .sub-dot {
            width: 7px;
            height: 7px;
            border-radius: 50%;
            background-color: #68c256;
            box-shadow: 0 0 8px rgba(104, 194, 86, 0.6);
        }

        .sub-icon-wrap {
            display: flex;
            align-items: center;
        }

        .sub-svg {
            width: 17px;
            height: 17px;
        }

        .sub-name {
            color: #e5e5e5;
            font-weight: 600;
        }

        .sub-subtitle {
            color: #888;
            font-size: 0.8rem;
            margin-left: 0.4rem;
            font-family: monospace;
        }

        .btn-launch-sm {
            padding: 0.25rem 0.6rem;
            font-size: 0.8rem;
            background-color: #2a2c2e;
            border: 1px solid rgba(255, 255, 255, 0.12);
            color: #1c98e8;
            border-radius: 4px;
            cursor: pointer;
        }

        .btn-launch-sm:hover {
            background-color: #1c98e8;
            color: #ffffff;
        }

        /* AWS Resource Groups */
        .aws-resource-group {
            border-top: 1px solid rgba(255, 255, 255, 0.06);
        }

        .resource-group-header {
            display: flex;
            align-items: center;
            gap: 0.6rem;
            padding: 0.65rem 1.2rem;
            background-color: #1d1e20;
            border-bottom: 1px solid rgba(255, 255, 255, 0.06);
            font-weight: 700;
            font-size: 0.92rem;
            color: #f2d42c;
        }

        .rg-svg {
            width: 18px;
            height: 18px;
        }

        .resource-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0.75rem 1.2rem;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            transition: background-color 0.15s;
        }

        .resource-row:hover {
            background-color: #2c2e32;
        }

        .res-left {
            display: flex;
            align-items: center;
            gap: 0.95rem;
            min-width: 0;
            flex: 1;
        }

        .empty-state {
            padding: 4rem 1rem;
            text-align: center;
            color: #888;
            font-size: 1.05rem;
        }

        /* Modal Dialog - Fixed Mouse and Touch Actions */
        .modal-backdrop {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(15, 17, 23, 0.8);
            backdrop-filter: blur(6px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 99999;
            user-select: auto !important;
            -webkit-user-select: auto !important;
            pointer-events: auto !important;
        }

        .modal-dialog {
            background-color: #26282b;
            border: 1px solid rgba(255, 255, 255, 0.12);
            border-radius: 12px;
            width: 520px;
            max-width: 92vw;
            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.65);
            overflow: hidden;
            display: flex;
            flex-direction: column;
            user-select: text !important;
            -webkit-user-select: text !important;
            pointer-events: auto !important;
        }

        .modal-header {
            padding: 1.1rem 1.4rem;
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
            display: flex;
            align-items: center;
            justify-content: space-between;
            background-color: #1f2022;
        }

        .modal-title-box {
            display: flex;
            align-items: center;
            gap: 0.65rem;
        }

        .modal-title-svg {
            width: 20px;
            height: 20px;
            color: #1c98e8;
        }

        .modal-header h3 {
            margin: 0;
            font-size: 1.15rem;
            font-weight: 700;
            color: #ffffff;
        }

        .btn-close {
            background: none;
            border: none;
            color: #888;
            cursor: pointer;
            font-size: 1.2rem;
            padding: 0.2rem 0.4rem;
            border-radius: 4px;
        }

        .btn-close:hover {
            color: #e8341c;
            background-color: rgba(232, 52, 28, 0.15);
        }

        .modal-body {
            padding: 1.4rem;
            display: flex;
            flex-direction: column;
            gap: 1rem;
            background-color: #26282b;
        }

        .form-group {
            display: flex;
            flex-direction: column;
            gap: 0.4rem;
        }

        .form-group.is-disabled {
            opacity: 0.45;
        }

        .form-row {
            display: flex;
            gap: 0.8rem;
        }

        .flex-1 { flex: 1; }
        .flex-2 { flex: 2; }

        .form-group label {
            font-size: 0.88rem;
            font-weight: 600;
            color: #d1d5db;
        }

        .form-control {
            background-color: #1d1e20;
            border: 1px solid rgba(255, 255, 255, 0.15);
            color: #ffffff;
            padding: 0.55rem 0.8rem;
            border-radius: 5px;
            font-size: 0.95rem;
            outline: none;
            transition: border-color 0.15s ease;
            user-select: text !important;
            -webkit-user-select: text !important;
            pointer-events: auto !important;
            cursor: text !important;
        }

        select.form-control {
            cursor: pointer !important;
        }

        .form-control:focus {
            border-color: #1c98e8;
            box-shadow: 0 0 0 2px rgba(28, 152, 232, 0.25);
        }

        /* Password Auth Checkbox Row */
        .auth-toggle-row {
            margin: 0.2rem 0;
            display: flex;
            align-items: center;
        }

        .checkbox-label {
            display: flex;
            align-items: center;
            gap: 0.6rem;
            font-size: 0.9rem;
            color: #ffffff;
            cursor: pointer;
            user-select: none;
        }

        .checkbox-input {
            width: 17px;
            height: 17px;
            accent-color: #1c98e8;
            cursor: pointer;
        }

        /* File Explorer Picker Row */
        .file-picker-row {
            display: flex;
            gap: 0.5rem;
            align-items: center;
        }

        .btn-browse {
            background-color: #2a2c2e;
            border: 1px solid rgba(255, 255, 255, 0.15);
            color: #1c98e8;
            border-radius: 5px;
            padding: 0.55rem 0.85rem;
            font-size: 0.88rem;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 0.45rem;
            white-space: nowrap;
            transition: all 0.15s ease;
        }

        .btn-browse:hover:not(:disabled) {
            background-color: #333538;
            border-color: #1c98e8;
        }

        .btn-browse:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        .browse-svg {
            width: 16px;
            height: 16px;
        }

        .modal-footer {
            padding: 1rem 1.4rem;
            background-color: #1f2022;
            border-top: 1px solid rgba(255, 255, 255, 0.08);
            display: flex;
            justify-content: flex-end;
            gap: 0.8rem;
        }

        .btn-secondary {
            background-color: #2a2c2e;
            border: 1px solid rgba(255, 255, 255, 0.15);
            color: #ffffff;
            padding: 0.5rem 1rem;
            border-radius: 5px;
            cursor: pointer;
            font-size: 0.92rem;
            font-weight: 600;
            transition: all 0.15s;
        }

        .btn-secondary:hover {
            background-color: #333538;
        }

        .btn-primary {
            background-color: #1c98e8;
            border: none;
            color: #ffffff;
            padding: 0.5rem 1.2rem;
            border-radius: 5px;
            cursor: pointer;
            font-size: 0.92rem;
            font-weight: 700;
            transition: all 0.15s;
            box-shadow: 0 2px 8px rgba(28, 152, 232, 0.3);
        }

        .btn-primary:hover {
            background-color: #38aefc;
            transform: translateY(-1px);
        }
    `],
})
export class InfrastructureDashboardTabComponent extends BaseTabComponent implements OnInit, OnDestroy {
    sections: CategorySection[] = []
    filteredSections: CategorySection[] = []
    selectedCategory = 'all'
    searchQuery = ''
    isRefreshing = false
    totalConnections = 0
    onlineCount = 0
    offlineCount = 0
    categoryCounts: Record<string, number> = {}

    // View Mode: Always start with compact mode by default!
    isCompactMode = true

    // Polling Management
    pollInterval = 30
    isPollingAll = false
    pollingItemIds = new Set<string>()
    private autoPollTimerHandle: any = null

    // Hidden items management
    hiddenItemIds = new Set<string>()
    showHidden = false

    // AWS Resources
    awsProfiles: string[] = []
    selectedAwsProfile = 'default'
    ec2Instances: EC2Instance[] = []
    awsResources: AwsResources = {
        instances: [],
        s3Buckets: [],
        eksClusters: [],
        ecsClusters: [],
        lambdas: [],
    }
    awsResourceTab: 'all' | 'ec2' | 's3' | 'eks' | 'ecs' | 'lambda' = 'all'

    // Azure Resources
    azureSubs: AzureSubscription[] = []
    selectedAzureSub = 'default'
    azureVMs: AzureVM[] = []

    // GCP Resources
    gcpProjects: GcpProject[] = []
    selectedGcpProject = 'main-project-acc-01'
    gcpInstances: GcpInstance[] = []

    // Live Docker containers
    dockerContainers: ContainerInfo[] = []

    // Copy to clipboard tracking
    copiedTarget: string | null = null

    // Modal state
    showNewModal = false
    newConn = {
        type: 'ssh',
        name: '',
        host: '',
        port: 22,
        user: '',
        usePassword: false,
        password: '',
        keyPath: '',
        command: 'powershell.exe',
        distro: 'WSL-Main-Ubuntu-24.04',
        awsInstanceId: '',
        azureRg: '',
        azureVmName: '',
        azurePublicIp: '',
        gcpProject: 'main-project-acc-01',
        gcpZone: 'us-central1-a',
        gcpInstName: '',
    }

    private pingIntervalHandle: any

    constructor (
        private profilesService: ProfilesService,
        private pingService: PingService,
        private awsService: AwsService,
        private azureService: AzureService,
        private gcpService: GcpService,
        private dockerService: DockerService,
        private notifications: NotificationsService,
        private configService: ConfigService,
        private cdr: ChangeDetectorRef,
        private app: AppService,
        injector: Injector,
    ) {
        super(injector)
        this.setTitle('⚡ Infrastructure Hub')
        this.loadHiddenIds()
    }

    async ngOnInit () {
        // Guarantee Hub is Tab 1
        setTimeout(() => ensureHubIsFirst(this.app), 50)

        // View Mode: Read user preference, default to compact!
        const savedMode = window.localStorage.getItem('tabby_infra_view_mode')
        if (savedMode !== null) {
            this.isCompactMode = savedMode === 'compact'
        } else {
            this.isCompactMode = true // Always start with compact
        }

        // Auto-Polling Interval preference (defaults to 30s)
        const savedPoll = window.localStorage.getItem('tabby_infra_poll_interval')
        if (savedPoll !== null) {
            this.pollInterval = parseInt(savedPoll, 10) || 0
        } else {
            this.pollInterval = 30
        }
        this.setupAutoPolling()

        this.awsProfiles = this.awsService.getProfiles()
        if (this.awsProfiles.length > 0 && !this.awsProfiles.includes(this.selectedAwsProfile)) {
            this.selectedAwsProfile = this.awsProfiles[0]
        }

        this.azureSubs = this.azureService.getSubscriptions()
        if (this.azureSubs.length > 0) {
            this.selectedAzureSub = this.azureSubs[0].id
        }

        this.gcpProjects = this.gcpService.getProjects()
        if (this.gcpProjects.length > 0) {
            this.selectedGcpProject = this.gcpProjects[0].projectId
        }

        await this.loadProfiles()
        await this.loadAwsResources()
        await this.loadAzureResources()
        await this.loadGcpResources()
        await this.loadDockerContainers()
        this.startHealthChecks()

        this.pingIntervalHandle = setInterval(() => {
            this.runHealthPings()
        }, 30000)
    }

    ngOnDestroy () {
        if (this.pingIntervalHandle) {
            clearInterval(this.pingIntervalHandle)
        }
        if (this.autoPollTimerHandle) {
            clearInterval(this.autoPollTimerHandle)
        }
    }

    loadHiddenIds () {
        try {
            const raw = window.localStorage.getItem('tabby_infra_hidden')
            if (raw) {
                const list = JSON.parse(raw)
                this.hiddenItemIds = new Set(list)
            }
        } catch {
            this.hiddenItemIds = new Set()
        }
    }

    saveHiddenIds () {
        try {
            window.localStorage.setItem('tabby_infra_hidden', JSON.stringify(Array.from(this.hiddenItemIds)))
        } catch (e) {
            console.error('Could not save hidden IDs:', e)
        }
    }

    isItemHidden (id: string): boolean {
        return this.hiddenItemIds.has(id)
    }

    hideItem (id: string, event?: MouseEvent) {
        if (event) event.stopPropagation()
        this.hiddenItemIds.add(id)
        this.saveHiddenIds()
        this.updateCounts()
        this.updateFilteredSections()
        this.cdr.detectChanges()
    }

    unhideItem (id: string, event?: MouseEvent) {
        if (event) event.stopPropagation()
        this.hiddenItemIds.delete(id)
        this.saveHiddenIds()
        this.updateCounts()
        this.updateFilteredSections()
        this.cdr.detectChanges()
    }

    toggleShowHidden (event?: MouseEvent) {
        if (event) event.stopPropagation()
        this.showHidden = !this.showHidden
        this.updateFilteredSections()
        this.cdr.detectChanges()
    }

    // Expand / Compact View Mode Toggle
    toggleViewMode (event?: MouseEvent) {
        if (event) event.stopPropagation()
        this.isCompactMode = !this.isCompactMode
        window.localStorage.setItem('tabby_infra_view_mode', this.isCompactMode ? 'compact' : 'expanded')
        for (const sec of this.sections) {
            sec.collapsed = this.isCompactMode
        }
        for (const sec of this.filteredSections) {
            sec.collapsed = this.isCompactMode
        }
        this.cdr.detectChanges()
    }

    trackBySection (index: number, section: CategorySection): string {
        return section.id
    }

    trackByItem (index: number, item: ConnectionItem): string {
        return item.id
    }

    trackByChild (index: number, child: any): string {
        return child.name
    }

    async loadProfiles () {
        console.log('[tabby-infrastructure] Loading Tabby profiles...')
        const rawProfiles = await this.profilesService.getProfiles({ includeBuiltin: true })
        this.categorizeProfiles(rawProfiles)
        this.updateCounts()
        this.updateFilteredSections()
        this.cdr.detectChanges()
    }

    async loadAwsResources () {
        try {
            this.awsResources = await this.awsService.fetchAllResources(this.selectedAwsProfile)
            this.ec2Instances = this.awsResources.instances
            this.updateAwsCloudItems()
            this.updateCounts()
            this.updateFilteredSections()
            this.cdr.detectChanges()
        } catch (e) {
            console.error('[tabby-infrastructure] Failed to load AWS resources:', e)
        }
    }

    async loadAzureResources () {
        try {
            this.azureVMs = await this.azureService.describeVMs(this.selectedAzureSub)
            this.updateAzureCloudItems()
            this.updateCounts()
            this.updateFilteredSections()
            this.cdr.detectChanges()
        } catch (e) {
            console.error('[tabby-infrastructure] Failed to load Azure VMs:', e)
        }
    }

    async loadGcpResources () {
        try {
            this.gcpInstances = await this.gcpService.describeInstances(this.selectedGcpProject)
            this.updateGcpCloudItems()
            this.updateCounts()
            this.updateFilteredSections()
            this.cdr.detectChanges()
        } catch (e) {
            console.error('[tabby-infrastructure] Failed to load GCP instances:', e)
        }
    }

    async loadDockerContainers () {
        try {
            this.dockerContainers = await this.dockerService.getContainers()
            this.attachDockerChildren()
            this.updateFilteredSections()
            this.cdr.detectChanges()
        } catch (e) {
            console.warn('[tabby-infrastructure] Failed to load docker containers:', e)
        }
    }

    // Docker and K8s in Live Watch / TUI Monitor Mode
    attachDockerChildren () {
        const wslSection = this.sections.find(s => s.id === 'wsl')
        if (!wslSection) return

        for (const item of wslSection.items) {
            const children: any[] = []

            // Live Container Sub-items
            if (this.dockerContainers.length > 0) {
                for (const c of this.dockerContainers) {
                    children.push({
                        name: c.name,
                        subtitle: `${c.image} (${c.status})`,
                        iconType: 'docker',
                        statusDot: 'sub-dot',
                        command: `docker exec -it ${c.name} sh`,
                    })
                }
            }

            // Continuous Live Watch / TUI Monitors
            children.push({
                name: 'Docker Live Monitor (watch / lazydocker)',
                subtitle: 'watch -n 2 docker ps (live monitor)',
                iconType: 'docker',
                command: 'if command -v lazydocker >/dev/null 2>&1; then lazydocker; elif command -v ctop >/dev/null 2>&1; then ctop; else watch -c -t -n 2 docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Image}}\t{{.Ports}}"; fi',
            })

            children.push({
                name: 'Kubernetes Live Monitor (k9s / watch pods)',
                subtitle: 'k9s or watch kubectl (live monitor)',
                iconType: 'k8s',
                command: 'if command -v k9s >/dev/null 2>&1; then k9s; else watch -c -t -n 2 kubectl get nodes,pods -A -o wide; fi',
            })

            children.push({
                name: 'Python 3 REPL',
                subtitle: 'Interactive Python session',
                iconType: 'python',
                command: 'python3 -q',
            })

            item.children = children
        }
    }

    categorizeProfiles (profiles: PartialProfile<Profile>[]) {
        const localItems: ConnectionItem[] = []
        const wslItems: ConnectionItem[] = []
        const sshItems: ConnectionItem[] = []

        const seenWslDistros = new Set<string>()
        const seenShellCommands = new Set<string>()
        const seenSshHosts = new Set<string>()

        // 1. Custom user profiles
        const customProfiles = profiles.filter((p: any) => !p.id?.startsWith('wsl:builtin') && !p.id?.startsWith('local:builtin'))

        for (const p of customProfiles) {
            const name = p.name || 'Unnamed Profile'
            const type = p.type || 'local'
            const opt: any = p.options || {}

            if (type === 'ssh') {
                const host = opt.host || 'unknown'
                const port = opt.port || 22
                const user = opt.user || 'root'
                const key = `${user}@${host}:${port}`
                seenSshHosts.add(key)

                sshItems.push({
                    id: p.id || `ssh-${name}`,
                    name,
                    subtitle: `${user}@${host}:${port}`,
                    category: 'ssh',
                    iconType: 'ssh',
                    badge: host,
                    host,
                    port,
                    user,
                    status: 'checking',
                    isCustom: true,
                    profile: p,
                })
            } else if (name.toLowerCase().includes('wsl') || (opt.command && opt.command.toLowerCase().includes('wsl'))) {
                seenWslDistros.add(name.toLowerCase())

                wslItems.push({
                    id: p.id || `wsl-${name}`,
                    name,
                    subtitle: opt.command || 'C:\\windows\\system32\\wsl.exe',
                    category: 'wsl',
                    iconType: 'ubuntu',
                    badge: 'Ubuntu 24.04 LTS',
                    badgeClass: 'badge-distro',
                    status: 'local',
                    isCustom: true,
                    profile: p,
                })
            } else {
                let iconType = 'windows'
                let badge = 'Shell'
                const cmdKey = (opt.command || name).toLowerCase()
                seenShellCommands.add(cmdKey)

                if (name.toLowerCase().includes('cmd')) {
                    badge = 'cmd.exe'
                } else if (name.toLowerCase().includes('git')) {
                    badge = 'bash'
                } else if (name.toLowerCase().includes('powershell')) {
                    badge = 'PowerShell'
                }

                localItems.push({
                    id: p.id || `local-${name}`,
                    name,
                    subtitle: opt.command || 'Windows Local Shell',
                    category: 'local',
                    iconType,
                    badge,
                    status: 'local',
                    isCustom: true,
                    profile: p,
                })
            }
        }

        // 2. Builtin profiles
        const builtinProfiles = profiles.filter((p: any) => p.id?.startsWith('wsl:builtin') || p.id?.startsWith('local:builtin'))

        for (const p of builtinProfiles) {
            const name = p.name || ''
            const opt: any = p.options || {}

            if (name.toLowerCase().includes('wsl')) {
                if (name.includes('docker-desktop') || name.includes('Default distro')) {
                    continue
                }
                if (seenWslDistros.has(name.toLowerCase())) {
                    continue
                }
                seenWslDistros.add(name.toLowerCase())

                wslItems.push({
                    id: p.id || `wsl-${name}`,
                    name,
                    subtitle: opt.command || 'WSL Linux Instance',
                    category: 'wsl',
                    iconType: 'ubuntu',
                    badge: 'WSL Distro',
                    badgeClass: 'badge-distro',
                    status: 'local',
                    isCustom: false,
                    profile: p,
                })
            } else {
                const cmdKey = (opt.command || name).toLowerCase()
                if (seenShellCommands.has(cmdKey)) {
                    continue
                }
                seenShellCommands.add(cmdKey)

                let badge = 'Shell'
                if (name.toLowerCase().includes('cmd')) badge = 'cmd.exe'
                else if (name.toLowerCase().includes('git')) badge = 'bash'

                localItems.push({
                    id: p.id || `local-${name}`,
                    name,
                    subtitle: opt.command || 'Windows Local Shell',
                    category: 'local',
                    iconType: 'windows',
                    badge,
                    status: 'local',
                    isCustom: false,
                    profile: p,
                })
            }
        }

        // Initialize sections with user preference (default compact: collapsed: true)
        this.sections = [
            {
                id: 'local',
                title: 'Local Machine',
                iconType: 'windows',
                badge: 'Windows 11',
                collapsed: this.isCompactMode,
                items: localItems,
            },
            {
                id: 'wsl',
                title: 'WSL Distributions',
                iconType: 'ubuntu',
                badge: `${wslItems.length} active`,
                collapsed: this.isCompactMode,
                items: wslItems,
            },
            {
                id: 'ssh',
                title: 'SSH & Remote Hosts',
                iconType: 'ssh',
                badge: `${sshItems.length} hosts`,
                collapsed: this.isCompactMode,
                items: sshItems,
            },
            {
                id: 'cloud',
                title: 'AWS Infrastructure',
                iconType: 'aws',
                badge: `${this.selectedAwsProfile}`,
                collapsed: this.isCompactMode,
                items: [],
            },
            {
                id: 'azure',
                title: 'Azure Cloud Infrastructure',
                iconType: 'azure',
                badge: 'main-sbox-sub-1',
                collapsed: this.isCompactMode,
                items: [],
            },
            {
                id: 'gcp',
                title: 'Google Cloud Platform',
                iconType: 'gcp',
                badge: 'main-project-acc-01',
                collapsed: this.isCompactMode,
                items: [],
            },
        ]

        this.attachDockerChildren()
        this.updateAwsCloudItems()
        this.updateAzureCloudItems()
        this.updateGcpCloudItems()
    }

    updateAwsCloudItems () {
        const cloudSection = this.sections.find(s => s.id === 'cloud')
        if (!cloudSection) return

        const cloudItems: ConnectionItem[] = []

        for (const inst of this.ec2Instances) {
            const isOnline = inst.state === 'running'
            const status = isOnline ? 'online' : inst.state === 'stopped' ? 'offline' : 'checking'

            cloudItems.push({
                id: `ec2-${inst.instanceId}`,
                name: `${inst.name}`,
                subtitle: `${inst.instanceId} · ${inst.instanceType} · ${inst.privateIp || ''} (${inst.az || ''})`,
                category: 'cloud',
                iconType: 'aws',
                badge: inst.state,
                badgeClass: isOnline ? 'badge-online' : 'badge-offline',
                status,
                ec2: inst,
                isCustom: false,
                children: [
                    {
                        name: 'AWS SSM Session (bash)',
                        subtitle: `aws ssm start-session --target ${inst.instanceId}`,
                        iconType: 'terminal',
                        command: `aws ssm start-session --target ${inst.instanceId} --profile ${this.selectedAwsProfile}`,
                    },
                ],
            })
        }

        cloudSection.items = cloudItems
        const total = cloudItems.length + this.awsResources.s3Buckets.length + this.awsResources.eksClusters.length + this.awsResources.ecsClusters.length + this.awsResources.lambdas.length
        cloudSection.badge = `${this.selectedAwsProfile} (${total} resources)`
    }

    updateAzureCloudItems () {
        const azureSection = this.sections.find(s => s.id === 'azure')
        if (!azureSection) return

        const azureItems: ConnectionItem[] = []

        for (const vm of this.azureVMs) {
            const isOnline = vm.state === 'running'
            const status = isOnline ? 'online' : vm.state === 'stopped' ? 'offline' : 'checking'

            azureItems.push({
                id: `azure-${vm.name}`,
                name: vm.name,
                subtitle: `${vm.resourceGroup} · ${vm.vmSize} · ${vm.location}`,
                category: 'azure',
                iconType: 'azure',
                badge: vm.state,
                badgeClass: isOnline ? 'badge-online' : 'badge-offline',
                status,
                azureVm: vm,
                isCustom: false,
                children: [
                    {
                        name: 'Azure CLI SSH',
                        subtitle: `az ssh --name ${vm.name} --resource-group ${vm.resourceGroup}`,
                        iconType: 'terminal',
                        command: `az ssh --name ${vm.name} --resource-group ${vm.resourceGroup}`,
                    },
                ],
            })
        }

        azureSection.items = azureItems
        azureSection.badge = `${this.selectedAzureSub} (${azureItems.length} VMs)`
    }

    updateGcpCloudItems () {
        const gcpSection = this.sections.find(s => s.id === 'gcp')
        if (!gcpSection) return

        const gcpItems: ConnectionItem[] = []

        for (const inst of this.gcpInstances) {
            const isOnline = inst.status === 'RUNNING'
            const status = isOnline ? 'online' : 'offline'

            gcpItems.push({
                id: `gcp-${inst.name}`,
                name: inst.name,
                subtitle: `${inst.zone} · ${inst.machineType} · ${inst.privateIp || ''}`,
                category: 'gcp',
                iconType: 'gcp',
                badge: inst.status,
                badgeClass: isOnline ? 'badge-online' : 'badge-offline',
                status,
                gcpInst: inst,
                isCustom: false,
                children: [
                    {
                        name: 'gcloud Compute SSH',
                        subtitle: `gcloud compute ssh ${inst.name} --zone ${inst.zone}`,
                        iconType: 'terminal',
                        command: `gcloud compute ssh ${inst.name} --zone ${inst.zone} --project ${this.selectedGcpProject}`,
                    },
                ],
            })
        }

        gcpSection.items = gcpItems
        gcpSection.badge = `${this.selectedGcpProject} (${gcpItems.length} instances)`
    }

    setAwsTab (tab: 'all' | 'ec2' | 's3' | 'eks' | 'ecs' | 'lambda', event?: MouseEvent) {
        if (event) event.stopPropagation()
        this.awsResourceTab = tab
        this.cdr.detectChanges()
    }

    onAwsProfileChange (event: Event) {
        this.selectedAwsProfile = (event.target as HTMLSelectElement).value
        this.loadAwsResources()
    }

    onAzureSubChange (event: Event) {
        this.selectedAzureSub = (event.target as HTMLSelectElement).value
        this.loadAzureResources()
    }

    onGcpProjectChange (event: Event) {
        this.selectedGcpProject = (event.target as HTMLSelectElement).value
        this.loadGcpResources()
    }

    async copyToClipboard (text: string, label: string, event?: MouseEvent) {
        if (event) {
            event.stopPropagation()
            event.preventDefault()
        }
        if (!text) return

        try {
            if (navigator?.clipboard?.writeText) {
                await navigator.clipboard.writeText(text)
            } else {
                const textarea = document.createElement('textarea')
                textarea.value = text
                document.body.appendChild(textarea)
                textarea.select()
                document.execCommand('copy')
                document.body.removeChild(textarea)
            }
            this.copiedTarget = text
            this.notifications.success(`Copied ${label}: ${text}`)
            setTimeout(() => {
                if (this.copiedTarget === text) {
                    this.copiedTarget = null
                    this.cdr.detectChanges()
                }
            }, 2500)
        } catch (e: any) {
            this.notifications.error(`Could not copy: ${e?.message || e}`)
        }
        this.cdr.detectChanges()
    }

    // Password auth checkbox toggle
    onTogglePasswordAuth (event: any) {
        this.newConn.usePassword = event.target.checked
        this.cdr.detectChanges()
    }

    // Native File Explorer picker for Private Key
    onKeyFileSelected (event: any) {
        const file = event.target.files?.[0]
        if (file) {
            const filePath = (file as any).path || file.name
            this.newConn.keyPath = filePath
            this.notifications.info(`Selected key file: ${filePath}`)
            this.cdr.detectChanges()
        }
        event.target.value = ''
    }

    // AWS EC2 Power Controls
    async startEC2 (inst: EC2Instance, event?: MouseEvent) {
        if (event) event.stopPropagation()
        inst.isActing = true
        this.notifications.info(`Starting EC2 instance ${inst.name}...`)
        this.cdr.detectChanges()

        const ok = await this.awsService.startInstance(inst.instanceId, this.selectedAwsProfile)
        if (ok) {
            inst.state = 'pending'
            this.notifications.success(`Instance ${inst.name} is starting!`)
        } else {
            this.notifications.error(`Failed to start ${inst.name}`)
        }
        inst.isActing = false
        this.updateAwsCloudItems()
        this.updateCounts()
        this.updateFilteredSections()
        this.cdr.detectChanges()
    }

    async stopEC2 (inst: EC2Instance, event?: MouseEvent) {
        if (event) event.stopPropagation()
        inst.isActing = true
        this.notifications.info(`Stopping EC2 instance ${inst.name}...`)
        this.cdr.detectChanges()

        const ok = await this.awsService.stopInstance(inst.instanceId, this.selectedAwsProfile)
        if (ok) {
            inst.state = 'stopping'
            this.notifications.success(`Instance ${inst.name} is stopping!`)
        } else {
            this.notifications.error(`Failed to stop ${inst.name}`)
        }
        inst.isActing = false
        this.updateAwsCloudItems()
        this.updateCounts()
        this.updateFilteredSections()
        this.cdr.detectChanges()
    }

    async rebootEC2 (inst: EC2Instance, event?: MouseEvent) {
        if (event) event.stopPropagation()
        inst.isActing = true
        this.notifications.info(`Rebooting EC2 instance ${inst.name}...`)
        this.cdr.detectChanges()

        const ok = await this.awsService.rebootInstance(inst.instanceId, this.selectedAwsProfile)
        if (ok) {
            this.notifications.success(`Reboot signal sent to ${inst.name}`)
        } else {
            this.notifications.error(`Failed to reboot ${inst.name}`)
        }
        inst.isActing = false
        this.cdr.detectChanges()
    }

    // Azure Power Controls
    async startAzureVM (vm: AzureVM, event?: MouseEvent) {
        if (event) event.stopPropagation()
        vm.isActing = true
        this.notifications.info(`Starting Azure VM ${vm.name}...`)
        this.cdr.detectChanges()

        const ok = await this.azureService.startVM(vm.resourceGroup, vm.name)
        if (ok) {
            vm.state = 'starting'
            this.notifications.success(`Azure VM ${vm.name} is starting!`)
        } else {
            this.notifications.error(`Failed to start Azure VM ${vm.name}`)
        }
        vm.isActing = false
        this.updateAzureCloudItems()
        this.updateCounts()
        this.updateFilteredSections()
        this.cdr.detectChanges()
    }

    async stopAzureVM (vm: AzureVM, event?: MouseEvent) {
        if (event) event.stopPropagation()
        vm.isActing = true
        this.notifications.info(`Deallocating Azure VM ${vm.name}...`)
        this.cdr.detectChanges()

        const ok = await this.azureService.stopVM(vm.resourceGroup, vm.name)
        if (ok) {
            vm.state = 'stopping'
            this.notifications.success(`Azure VM ${vm.name} is deallocating!`)
        } else {
            this.notifications.error(`Failed to stop Azure VM ${vm.name}`)
        }
        vm.isActing = false
        this.updateAzureCloudItems()
        this.updateCounts()
        this.updateFilteredSections()
        this.cdr.detectChanges()
    }

    async restartAzureVM (vm: AzureVM, event?: MouseEvent) {
        if (event) event.stopPropagation()
        vm.isActing = true
        this.notifications.info(`Restarting Azure VM ${vm.name}...`)
        this.cdr.detectChanges()

        const ok = await this.azureService.restartVM(vm.resourceGroup, vm.name)
        if (ok) {
            this.notifications.success(`Restart signal sent to Azure VM ${vm.name}`)
        } else {
            this.notifications.error(`Failed to restart Azure VM ${vm.name}`)
        }
        vm.isActing = false
        this.cdr.detectChanges()
    }

    // GCP Power Controls
    async startGcpInstance (inst: GcpInstance, event?: MouseEvent) {
        if (event) event.stopPropagation()
        inst.isActing = true
        this.notifications.info(`Starting GCP instance ${inst.name}...`)
        this.cdr.detectChanges()

        const ok = await this.gcpService.startInstance(inst.name, inst.zone, this.selectedGcpProject)
        if (ok) {
            inst.status = 'STAGING'
            this.notifications.success(`GCP Instance ${inst.name} is starting!`)
        } else {
            this.notifications.error(`Failed to start GCP instance ${inst.name}`)
        }
        inst.isActing = false
        this.updateGcpCloudItems()
        this.updateCounts()
        this.updateFilteredSections()
        this.cdr.detectChanges()
    }

    async stopGcpInstance (inst: GcpInstance, event?: MouseEvent) {
        if (event) event.stopPropagation()
        inst.isActing = true
        this.notifications.info(`Stopping GCP instance ${inst.name}...`)
        this.cdr.detectChanges()

        const ok = await this.gcpService.stopInstance(inst.name, inst.zone, this.selectedGcpProject)
        if (ok) {
            inst.status = 'STOPPED'
            this.notifications.success(`GCP Instance ${inst.name} is stopped!`)
        } else {
            this.notifications.error(`Failed to stop GCP instance ${inst.name}`)
        }
        inst.isActing = false
        this.updateGcpCloudItems()
        this.updateCounts()
        this.updateFilteredSections()
        this.cdr.detectChanges()
    }

    async resetGcpInstance (inst: GcpInstance, event?: MouseEvent) {
        if (event) event.stopPropagation()
        inst.isActing = true
        this.notifications.info(`Resetting GCP instance ${inst.name}...`)
        this.cdr.detectChanges()

        const ok = await this.gcpService.resetInstance(inst.name, inst.zone, this.selectedGcpProject)
        if (ok) {
            this.notifications.success(`Reset signal sent to GCP instance ${inst.name}`)
        } else {
            this.notifications.error(`Failed to reset GCP instance ${inst.name}`)
        }
        inst.isActing = false
        this.cdr.detectChanges()
    }

    async deleteProfile (item: ConnectionItem, event?: MouseEvent) {
        if (event) event.stopPropagation()
        if (!item.profile) return

        if (confirm(`Are you sure you want to delete profile "${item.name}" from Tabby?`)) {
            try {
                await this.profilesService.deleteProfile(item.profile)
                await this.configService.save()
                this.notifications.success(`Deleted ${item.name}`)
                await this.loadProfiles()
            } catch (e: any) {
                this.notifications.error(`Failed to delete profile: ${e?.message || e}`)
            }
        }
    }

    openNewModal (event?: MouseEvent) {
        if (event) event.stopPropagation()
        this.newConn = {
            type: 'ssh',
            name: '',
            host: '',
            port: 22,
            user: 'root',
            usePassword: false,
            password: '',
            keyPath: '',
            command: 'powershell.exe',
            distro: 'WSL-Main-Ubuntu-24.04',
            awsInstanceId: '',
            azureRg: '',
            azureVmName: '',
            azurePublicIp: '',
            gcpProject: this.selectedGcpProject || 'main-project-acc-01',
            gcpZone: 'us-central1-a',
            gcpInstName: '',
        }
        this.showNewModal = true
        this.cdr.detectChanges()
    }

    closeNewModal (event?: MouseEvent) {
        if (event) event.stopPropagation()
        this.showNewModal = false
        this.cdr.detectChanges()
    }

    async saveNewConnection () {
        const name = this.newConn.name.trim()
        if (!name) {
            this.notifications.error('Please specify a connection name')
            return
        }

        try {
            let profileData: PartialProfile<Profile>

            if (this.newConn.type === 'ssh') {
                const host = this.newConn.host.trim()
                if (!host) {
                    this.notifications.error('Please enter a valid Host / IP')
                    return
                }

                // Password Auth vs Key File Auth
                if (this.newConn.usePassword) {
                    profileData = {
                        type: 'ssh',
                        name,
                        options: {
                            host,
                            port: this.newConn.port || 22,
                            user: this.newConn.user.trim() || 'root',
                            auth: 'password',
                            password: this.newConn.password ? this.newConn.password.trim() : undefined,
                        },
                    }
                } else {
                    profileData = {
                        type: 'ssh',
                        name,
                        options: {
                            host,
                            port: this.newConn.port || 22,
                            user: this.newConn.user.trim() || 'root',
                            auth: this.newConn.keyPath ? 'publicKey' : 'password',
                            privateKeys: this.newConn.keyPath ? [this.newConn.keyPath.trim()] : [],
                        },
                    }
                }
            } else if (this.newConn.type === 'wsl') {
                const distro = this.newConn.distro.trim() || 'WSL-Main-Ubuntu-24.04'
                profileData = {
                    type: 'local',
                    name,
                    options: {
                        command: 'wsl.exe',
                        args: ['-d', distro],
                    },
                }
            } else if (this.newConn.type === 'aws') {
                const target = this.newConn.awsInstanceId.trim()
                profileData = {
                    type: 'local',
                    name: `AWS: ${name}`,
                    options: {
                        command: 'powershell.exe',
                        args: ['-NoExit', '-Command', `aws ssm start-session --target ${target} --profile ${this.selectedAwsProfile}`],
                    },
                }
            } else if (this.newConn.type === 'azure') {
                const vm = this.newConn.azureVmName.trim() || name
                const rg = this.newConn.azureRg.trim()
                profileData = {
                    type: 'local',
                    name: `Azure: ${name}`,
                    options: {
                        command: 'powershell.exe',
                        args: ['-NoExit', '-Command', `az ssh --name ${vm} --resource-group ${rg}`],
                    },
                }
            } else if (this.newConn.type === 'gcp') {
                const inst = this.newConn.gcpInstName.trim() || name
                const zone = this.newConn.gcpZone.trim() || 'us-central1-a'
                const prj = this.newConn.gcpProject.trim() || this.selectedGcpProject
                profileData = {
                    type: 'local',
                    name: `GCP: ${name}`,
                    options: {
                        command: 'powershell.exe',
                        args: ['-NoExit', '-Command', `gcloud compute ssh ${inst} --zone ${zone} --project ${prj}`],
                    },
                }
            } else {
                profileData = {
                    type: 'local',
                    name,
                    options: {
                        command: this.newConn.command.trim() || 'powershell.exe',
                        args: [],
                    },
                }
            }

            await this.profilesService.newProfile(profileData)
            await this.configService.save()
            this.notifications.success(`Saved connection "${name}" to Tabby`)
            this.showNewModal = false
            await this.loadProfiles()
        } catch (e: any) {
            console.error('[tabby-infrastructure] Failed to create connection:', e)
            this.notifications.error(`Failed to create connection: ${e?.message || e}`)
        }
    }

    updateCounts () {
        this.categoryCounts = {}
        let total = 0
        let online = 0
        let offline = 0

        for (const sec of this.sections) {
            const activeItems = sec.items.filter(it => this.showHidden || !this.isItemHidden(it.id))
            this.categoryCounts[sec.id] = activeItems.length
            total += activeItems.length

            for (const it of activeItems) {
                if (it.status === 'online' || it.status === 'local') {
                    online++
                } else if (it.status === 'offline') {
                    offline++
                }
            }
        }

        this.totalConnections = total
        this.onlineCount = online
        this.offlineCount = offline
    }

    updateFilteredSections () {
        const query = this.searchQuery.trim().toLowerCase()

        this.filteredSections = this.sections
            .filter(sec => this.selectedCategory === 'all' || sec.id === this.selectedCategory)
            .map(sec => {
                const items = sec.items.filter(item => {
                    if (!this.showHidden && this.isItemHidden(item.id)) {
                        return false
                    }
                    if (!query) return true
                    return (
                        item.name.toLowerCase().includes(query) ||
                        item.subtitle.toLowerCase().includes(query) ||
                        (item.badge && item.badge.toLowerCase().includes(query)) ||
                        (item.host && item.host.toLowerCase().includes(query)) ||
                        (item.user && item.user.toLowerCase().includes(query)) ||
                        (item.ec2 && item.ec2.publicIp && item.ec2.publicIp.includes(query)) ||
                        (item.ec2 && item.ec2.instanceId && item.ec2.instanceId.toLowerCase().includes(query)) ||
                        (item.azureVm && item.azureVm.publicIp && item.azureVm.publicIp.includes(query)) ||
                        (item.gcpInst && item.gcpInst.publicIp && item.gcpInst.publicIp.includes(query))
                    )
                })
                return {
                    ...sec,
                    items,
                }
            })
            .filter(sec => sec.items.length > 0)
    }

    onSearchInput (event: Event) {
        this.searchQuery = (event.target as HTMLInputElement).value
        this.updateFilteredSections()
    }

    clearSearch (event?: MouseEvent) {
        if (event) event.stopPropagation()
        this.searchQuery = ''
        this.updateFilteredSections()
    }

    setCategory (category: string, event?: MouseEvent) {
        if (event) event.stopPropagation()
        this.selectedCategory = category
        this.updateFilteredSections()
    }

    toggleSection (section: CategorySection, event?: MouseEvent) {
        if (event) event.stopPropagation()
        section.collapsed = !section.collapsed
        const fSec = this.filteredSections.find(s => s.id === section.id)
        if (fSec) fSec.collapsed = section.collapsed
        this.cdr.detectChanges()
    }

    startHealthChecks () {
        this.runHealthPings()
    }

    async runHealthPings () {
        for (const sec of this.sections) {
            for (const item of sec.items) {
                if (item.category === 'ssh' && item.host) {
                    this.pingHost(item)
                }
            }
        }
    }

    async pingHost (item: ConnectionItem, event?: MouseEvent) {
        if (event) event.stopPropagation()
        if (!item.host) return
        item.status = 'checking'
        this.cdr.detectChanges()

        try {
            const status: HostStatus = await this.pingService.checkHost(item.host, item.port || 22, 2000)
            item.status = status.reachable ? 'online' : 'offline'
            item.latency = status.latency
        } catch {
            item.status = 'offline'
            item.latency = undefined
        }

        this.updateCounts()
        this.cdr.detectChanges()
    }

    isItemPolling (item: ConnectionItem): boolean {
        return this.pollingItemIds.has(item.id)
    }

    async pollSingleItem (item: ConnectionItem, event?: MouseEvent) {
        if (event) {
            event.stopPropagation()
            event.preventDefault()
        }
        if (this.pollingItemIds.has(item.id)) return

        this.pollingItemIds.add(item.id)
        this.cdr.detectChanges()

        try {
            if (item.ec2) {
                const updated = await this.awsService.describeSingleInstance(item.ec2.instanceId, this.selectedAwsProfile)
                if (updated) {
                    item.ec2.state = updated.state
                    item.ec2.publicIp = updated.publicIp
                    item.ec2.privateIp = updated.privateIp
                    item.badge = updated.state
                    item.badgeClass = updated.state === 'running' ? 'badge-online' : 'badge-offline'
                    item.status = updated.state === 'running' ? 'online' : 'offline'
                    const idx = this.ec2Instances.findIndex(i => i.instanceId === updated.instanceId)
                    if (idx !== -1) {
                        this.ec2Instances[idx] = updated
                    }
                    this.notifications.info(`Refreshed ${item.name}: ${updated.state} ${updated.publicIp ? '(' + updated.publicIp + ')' : ''}`)
                } else {
                    this.notifications.warn(`Could not poll status for ${item.name}`)
                }
            } else if (item.azureVm) {
                const updated = await this.azureService.describeSingleVM(item.azureVm.resourceGroup, item.azureVm.name, this.selectedAzureSub)
                if (updated) {
                    item.azureVm.state = updated.state
                    item.badge = updated.state
                    item.badgeClass = updated.state === 'running' ? 'badge-online' : 'badge-offline'
                    item.status = updated.state === 'running' ? 'online' : 'offline'
                    this.notifications.info(`Refreshed Azure VM ${item.name}: ${updated.state}`)
                } else {
                    this.notifications.warn(`Could not poll status for Azure VM ${item.name}`)
                }
            } else if (item.gcpInst) {
                const updated = await this.gcpService.describeSingleInstance(item.gcpInst.name, item.gcpInst.zone, this.selectedGcpProject)
                if (updated) {
                    item.gcpInst.status = updated.status
                    if (updated.publicIp) item.gcpInst.publicIp = updated.publicIp
                    item.badge = updated.status
                    item.badgeClass = updated.status === 'RUNNING' ? 'badge-online' : 'badge-offline'
                    item.status = updated.status === 'RUNNING' ? 'online' : 'offline'
                    this.notifications.info(`Refreshed GCP instance ${item.name}: ${updated.status}`)
                } else {
                    this.notifications.warn(`Could not poll status for GCP instance ${item.name}`)
                }
            } else if (item.category === 'ssh' && item.host) {
                await this.pingHost(item)
                this.notifications.info(`Probed ${item.name}: ${item.status === 'online' ? item.latency + 'ms' : 'offline'}`)
            } else if (item.category === 'wsl') {
                await this.loadDockerContainers()
                this.notifications.info(`Refreshed WSL / Docker status for ${item.name}`)
            } else {
                this.notifications.info(`Refreshed ${item.name}`)
            }
        } catch (e: any) {
            console.error('[tabby-infrastructure] Error polling item:', e)
            this.notifications.error(`Failed to poll ${item.name}: ${e?.message || e}`)
        } finally {
            this.pollingItemIds.delete(item.id)
            this.updateCounts()
            this.updateFilteredSections()
            this.cdr.detectChanges()
        }
    }

    onPollIntervalChange (event: any) {
        this.pollInterval = parseInt(event.target.value, 10) || 0
        window.localStorage.setItem('tabby_infra_poll_interval', String(this.pollInterval))
        this.setupAutoPolling()
        if (this.pollInterval > 0) {
            this.notifications.info(`Auto-polling enabled: every ${this.pollInterval}s`)
        } else {
            this.notifications.info('Auto-polling disabled (manual mode)')
        }
        this.cdr.detectChanges()
    }

    setupAutoPolling () {
        if (this.autoPollTimerHandle) {
            clearInterval(this.autoPollTimerHandle)
            this.autoPollTimerHandle = null
        }
        if (this.pollInterval > 0) {
            this.autoPollTimerHandle = setInterval(() => {
                this.pollAllSilently()
            }, this.pollInterval * 1000)
        }
    }

    async pollAll (event?: MouseEvent) {
        if (event) event.stopPropagation()
        this.isPollingAll = true
        this.isRefreshing = true
        this.cdr.detectChanges()

        try {
            await Promise.all([
                this.loadProfiles(),
                this.loadAwsResources(),
                this.loadAzureResources(),
                this.loadGcpResources(),
                this.loadDockerContainers(),
                this.runHealthPings(),
            ])
            this.notifications.success('All infrastructure resources polled successfully!')
        } catch (e: any) {
            this.notifications.error(`Poll all failed: ${e?.message || e}`)
        } finally {
            setTimeout(() => {
                this.isPollingAll = false
                this.isRefreshing = false
                this.cdr.detectChanges()
            }, 400)
        }
    }

    async pollAllSilently () {
        try {
            await Promise.all([
                this.loadAwsResources(),
                this.loadAzureResources(),
                this.loadGcpResources(),
                this.runHealthPings(),
            ])
        } catch (e) {
            console.warn('[tabby-infrastructure] Background auto-poll error:', e)
        }
    }

    async refreshAll (event?: MouseEvent) {
        await this.pollAll(event)
    }

    async launch (item: ConnectionItem, event?: MouseEvent) {
        if (event) {
            event.stopPropagation()
            event.preventDefault()
        }

        if (item.ec2) return this.launchSSM(item.ec2, event)
        if (item.azureVm) return this.launchAzure(item.azureVm, event)
        if (item.gcpInst) return this.launchGCP(item.gcpInst, event)

        if (!item.profile) return

        console.log('[tabby-infrastructure] Launching profile:', item.name)
        try {
            if (this.profilesService.launchProfile) {
                await this.profilesService.launchProfile(item.profile)
            } else {
                await this.profilesService.openNewTabForProfile(item.profile)
            }
        } catch (e: any) {
            console.error('[tabby-infrastructure] Error launching profile:', e)
            this.notifications.error(`Failed to launch ${item.name}: ${e?.message || e}`)
        }
    }

    async launchSSM (inst: EC2Instance, event?: MouseEvent) {
        if (event) {
            event.stopPropagation()
            event.preventDefault()
        }

        if (inst.state !== 'running') {
            this.notifications.warn(`Instance ${inst.name} is ${inst.state}. Please start it first.`)
            return
        }

        const isWindows = process.platform === 'win32'
        const command = isWindows ? 'powershell.exe' : 'bash'
        const args = isWindows
            ? [
                '-NoExit',
                '-Command',
                `Write-Host "Connecting to ${inst.name} (${inst.instanceId}) via AWS SSM..." -ForegroundColor Cyan; aws ssm start-session --target ${inst.instanceId} --profile ${this.selectedAwsProfile}`,
            ]
            : [
                '-c',
                `echo "Connecting to ${inst.name} (${inst.instanceId}) via AWS SSM..."; aws ssm start-session --target ${inst.instanceId} --profile ${this.selectedAwsProfile}; exec bash`,
            ]

        try {
            await this.profilesService.openNewTabForProfile({
                type: 'local',
                name: `SSM: ${inst.name}`,
                options: { command, args },
            } as any)
        } catch (e: any) {
            this.notifications.error(`Failed to launch SSM: ${e?.message || e}`)
        }
    }

    async launchAzure (vm: AzureVM, event?: MouseEvent) {
        if (event) {
            event.stopPropagation()
            event.preventDefault()
        }

        const isWindows = process.platform === 'win32'
        const command = isWindows ? 'powershell.exe' : 'bash'
        let sshCmd = `az ssh --name ${vm.name} --resource-group ${vm.resourceGroup}`
        if (vm.publicIp && vm.adminUsername) {
            sshCmd = `ssh ${vm.adminUsername}@${vm.publicIp}`
        }

        const args = isWindows
            ? [
                '-NoExit',
                '-Command',
                `Write-Host "Connecting to Azure VM: ${vm.name}..." -ForegroundColor Cyan; ${sshCmd}`,
            ]
            : [
                '-c',
                `echo "Connecting to Azure VM: ${vm.name}..."; ${sshCmd}; exec bash`,
            ]

        try {
            await this.profilesService.openNewTabForProfile({
                type: 'local',
                name: `Azure: ${vm.name}`,
                options: { command, args },
            } as any)
        } catch (e: any) {
            this.notifications.error(`Failed to connect to Azure VM: ${e?.message || e}`)
        }
    }

    async launchGCP (inst: GcpInstance, event?: MouseEvent) {
        if (event) {
            event.stopPropagation()
            event.preventDefault()
        }

        const isWindows = process.platform === 'win32'
        const command = isWindows ? 'powershell.exe' : 'bash'
        const gcpCmd = `gcloud compute ssh ${inst.name} --zone ${inst.zone} --project ${this.selectedGcpProject}`

        const args = isWindows
            ? [
                '-NoExit',
                '-Command',
                `Write-Host "Connecting to GCP VM: ${inst.name}..." -ForegroundColor Cyan; ${gcpCmd}`,
            ]
            : [
                '-c',
                `echo "Connecting to GCP VM: ${inst.name}..."; ${gcpCmd}; exec bash`,
            ]

        try {
            await this.profilesService.openNewTabForProfile({
                type: 'local',
                name: `GCP: ${inst.name}`,
                options: { command, args },
            } as any)
        } catch (e: any) {
            this.notifications.error(`Failed to connect to GCP VM: ${e?.message || e}`)
        }
    }

    async launchS3 (bucket: S3Bucket, event?: MouseEvent) {
        if (event) {
            event.stopPropagation()
            event.preventDefault()
        }

        const isWindows = process.platform === 'win32'
        const command = isWindows ? 'powershell.exe' : 'bash'
        const args = isWindows
            ? [
                '-NoExit',
                '-Command',
                `Write-Host "Listing s3://${bucket.name} contents..." -ForegroundColor Cyan; aws s3 ls s3://${bucket.name} --profile ${this.selectedAwsProfile}`,
            ]
            : [
                '-c',
                `echo "Listing s3://${bucket.name} contents..."; aws s3 ls s3://${bucket.name} --profile ${this.selectedAwsProfile}; exec bash`,
            ]

        try {
            await this.profilesService.openNewTabForProfile({
                type: 'local',
                name: `S3: ${bucket.name}`,
                options: { command, args },
            } as any)
        } catch (e: any) {
            this.notifications.error(`Failed to browse S3: ${e?.message || e}`)
        }
    }

    // Launch sub-tool in exact registered WSL distro with live watch/monitoring
    async launchSubTool (parentItem: ConnectionItem, child: any, event?: MouseEvent) {
        if (event) {
            event.stopPropagation()
            event.preventDefault()
        }

        console.log('[tabby-infrastructure] Launching sub-tool:', child.name, 'cmd:', child.command)

        try {
            const isWindows = process.platform === 'win32'

            if (parentItem.category === 'wsl') {
                let distro = ''
                const optArgs: string[] = (parentItem.profile?.options as any)?.args || []
                const dIdx = optArgs.indexOf('-d')
                if (dIdx !== -1 && optArgs[dIdx + 1]) {
                    distro = optArgs[dIdx + 1]
                } else if ((parentItem.profile?.options as any)?.distro) {
                    distro = (parentItem.profile?.options as any).distro
                } else {
                    distro = parentItem.name
                }

                const wslArgs = ['-d', distro]

                const cdIdx = optArgs.indexOf('--cd')
                if (cdIdx !== -1 && optArgs[cdIdx + 1]) {
                    wslArgs.push('--cd', optArgs[cdIdx + 1])
                }

                wslArgs.push('--', 'bash', '-c', `${child.command}; exec bash`)

                console.log('[tabby-infrastructure] Spawning WSL sub-tool with args:', wslArgs)

                await this.profilesService.openNewTabForProfile({
                    type: 'local',
                    name: `${child.name}`,
                    options: {
                        command: 'wsl.exe',
                        args: wslArgs,
                    },
                } as any)
                return
            }

            let command = 'powershell.exe'
            let args: string[] = []
            if (isWindows) {
                command = 'powershell.exe'
                args = ['-NoExit', '-Command', child.command]
            } else {
                command = 'bash'
                args = ['-c', `${child.command}; exec bash`]
            }

            await this.profilesService.openNewTabForProfile({
                type: 'local',
                name: child.name,
                options: {
                    command,
                    args,
                },
            } as any)
        } catch (e: any) {
            console.error('[tabby-infrastructure] Error launching sub-tool:', e)
            this.notifications.error(`Failed to launch ${child.name}: ${e?.message || e}`)
        }
    }

    getStatusTooltip (item: ConnectionItem): string {
        if (item.ec2) return `EC2 Instance: ${item.ec2.state}`
        if (item.azureVm) return `Azure VM: ${item.azureVm.state}`
        if (item.gcpInst) return `GCP Instance: ${item.gcpInst.status}`
        if (item.status === 'online') return `Reachable (${item.latency}ms)`
        if (item.status === 'offline') return 'Host unreachable or stopped'
        if (item.status === 'checking') return 'Probing connection...'
        return 'Local machine environment'
    }
}
