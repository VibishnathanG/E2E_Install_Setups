import { TranslateService } from '@ngx-translate/core';
import { ProfilesService } from './services/profiles.service';
import { HotkeyDescription, HotkeyProvider } from './api/hotkeyProvider';
/** @hidden */
export declare class AppHotkeyProvider extends HotkeyProvider {
    private profilesService;
    private translate;
    hotkeys: HotkeyDescription[];
    constructor(profilesService: ProfilesService, translate: TranslateService);
    provide(): Promise<HotkeyDescription[]>;
}
