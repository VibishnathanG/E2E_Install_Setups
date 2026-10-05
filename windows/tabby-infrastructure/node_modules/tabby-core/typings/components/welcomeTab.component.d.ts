import { Injector } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { BaseTabComponent } from './baseTab.component';
import { ConfigService } from '../services/config.service';
import { LocaleService } from '../services/locale.service';
/** @hidden */
export declare class WelcomeTabComponent extends BaseTabComponent {
    config: ConfigService;
    locale: LocaleService;
    enableGlobalHotkey: boolean;
    allLanguages: {
        code: string;
        name: string;
    }[];
    constructor(config: ConfigService, locale: LocaleService, translate: TranslateService, injector: Injector);
    closeAndDisable(): Promise<void>;
}
