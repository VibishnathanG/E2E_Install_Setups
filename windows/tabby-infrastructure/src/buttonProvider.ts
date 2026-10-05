import { Injectable } from '@angular/core'
import { ToolbarButtonProvider, ToolbarButton, AppService, HotkeysService, TabsService } from 'tabby-core'
import { InfrastructureDashboardTabComponent } from './components/dashboardTab.component'
import { ensureHubIsFirst } from './index'

const HOME_SVG = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>`

@Injectable()
export class InfrastructureToolbarButtonProvider extends ToolbarButtonProvider {
    constructor (
        private app: AppService,
        private tabsService: TabsService,
        hotkeys: HotkeysService,
    ) {
        super()
        hotkeys.hotkey$.subscribe(async (hotkey) => {
            if (hotkey === 'infrastructure-tab') {
                this.open()
            }
        })
    }

    provide (): ToolbarButton[] {
        return [{
            icon: HOME_SVG,
            title: 'Infrastructure Hub (Tab 1)',
            weight: -10,
            click: (): void => this.open(),
        }]
    }

    open (): void {
        const tab = this.app.tabs.find(t =>
            t instanceof InfrastructureDashboardTabComponent ||
            (t as any)?.constructor?.name === 'InfrastructureDashboardTabComponent'
        )
        if (tab) {
            ensureHubIsFirst(this.app)
            this.app.selectTab(tab)
        } else {
            const newTab = this.tabsService.create({ type: InfrastructureDashboardTabComponent })
            this.app.addTabRaw(newTab, 0)
            this.app.selectTab(newTab)
        }
    }
}
