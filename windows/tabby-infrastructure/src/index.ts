import { NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import TabbyCorePlugin, { ToolbarButtonProvider, HotkeyProvider, ConfigProvider, AppService, HotkeysService, TabsService } from 'tabby-core'

import { PingService } from './services/ping.service'
import { AwsService } from './services/aws.service'
import { AzureService } from './services/azure.service'
import { GcpService } from './services/gcp.service'
import { DockerService } from './services/docker.service'
import { InfrastructureDashboardTabComponent } from './components/dashboardTab.component'
import { InfrastructureToolbarButtonProvider } from './buttonProvider'
import { InfrastructureHotkeyProvider } from './hotkeys'
import { InfrastructureConfigProvider } from './config'

let isReordering = false
export function ensureHubIsFirst (app: AppService): void {
    if (isReordering || !app || !app.tabs || app.tabs.length <= 1) return
    const hubIndex = app.tabs.findIndex(t =>
        t instanceof InfrastructureDashboardTabComponent ||
        (t as any)?.constructor?.name === 'InfrastructureDashboardTabComponent'
    )
    if (hubIndex > 0) {
        isReordering = true
        try {
            const [hubTab] = app.tabs.splice(hubIndex, 1)
            app.tabs.unshift(hubTab)
            app.emitTabsChanged()
        } catch (e) {
            console.error('[tabby-infrastructure] Error ensuring Hub is first tab:', e)
        } finally {
            isReordering = false
        }
    }
}

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        TabbyCorePlugin,
    ],
    providers: [
        PingService,
        AwsService,
        AzureService,
        GcpService,
        DockerService,
        { provide: ToolbarButtonProvider, useClass: InfrastructureToolbarButtonProvider, multi: true },
        { provide: HotkeyProvider, useClass: InfrastructureHotkeyProvider, multi: true },
        { provide: ConfigProvider, useClass: InfrastructureConfigProvider, multi: true },
    ],
    declarations: [
        InfrastructureDashboardTabComponent,
    ],
    exports: [
        InfrastructureDashboardTabComponent,
    ],
})
export default class InfrastructureModule {
    constructor (
        app: AppService,
        hotkeys: HotkeysService,
        tabsService: TabsService,
    ) {
        hotkeys.hotkey$.subscribe(async (hotkey) => {
            if (hotkey === 'infrastructure-tab') {
                const existing = app.tabs.find(t =>
                    t instanceof InfrastructureDashboardTabComponent ||
                    (t as any)?.constructor?.name === 'InfrastructureDashboardTabComponent'
                )
                if (existing) {
                    ensureHubIsFirst(app)
                    app.selectTab(existing)
                } else {
                    const tab = tabsService.create({ type: InfrastructureDashboardTabComponent })
                    app.addTabRaw(tab, 0)
                    app.selectTab(tab)
                }
            }
        })

        // Ensure Hub is always at index 0 (Tab 1) on startup
        app.ready$.subscribe(() => {
            setTimeout(() => {
                const existing = app.tabs.find(t =>
                    t instanceof InfrastructureDashboardTabComponent ||
                    (t as any)?.constructor?.name === 'InfrastructureDashboardTabComponent'
                )
                if (existing) {
                    ensureHubIsFirst(app)
                } else {
                    // Auto open Hub at tab 1 on startup
                    const tab = tabsService.create({ type: InfrastructureDashboardTabComponent })
                    app.addTabRaw(tab, 0)
                }
            }, 300)
        })

        // Keep Hub pinned at Tab 1 when other tabs are opened or reordered
        app.tabOpened$.subscribe(() => {
            setTimeout(() => ensureHubIsFirst(app), 50)
        })

        app.tabsChanged$.subscribe(() => {
            ensureHubIsFirst(app)
        })
    }
}

export { InfrastructureDashboardTabComponent }
