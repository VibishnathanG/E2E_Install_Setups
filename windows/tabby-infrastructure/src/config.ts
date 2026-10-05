import { Injectable } from '@angular/core'
import { ConfigProvider } from 'tabby-core'

@Injectable()
export class InfrastructureConfigProvider extends ConfigProvider {
    defaults = {
        hotkeys: {
            'infrastructure-tab': ['Alt-I'],
        },
        infrastructure: {
            pingInterval: 15,
            autoPing: true,
        },
    }
    platformDefaults = {}
}
