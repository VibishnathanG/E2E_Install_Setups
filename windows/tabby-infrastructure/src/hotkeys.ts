import { Injectable } from '@angular/core'
import { HotkeyDescription, HotkeyProvider } from 'tabby-core'

@Injectable()
export class InfrastructureHotkeyProvider extends HotkeyProvider {
    async provide (): Promise<HotkeyDescription[]> {
        return [
            {
                id: 'infrastructure-tab',
                name: 'Toggle Infrastructure Hub',
            },
        ]
    }
}
