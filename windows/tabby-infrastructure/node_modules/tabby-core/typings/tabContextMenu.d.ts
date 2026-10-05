import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import { AppService } from './services/app.service';
import { BaseTabComponent } from './components/baseTab.component';
import { TabContextMenuItemProvider } from './api/tabContextMenuProvider';
import { MenuItemOptions } from './api/menu';
import { ProfilesService } from './services/profiles.service';
import { TabsService } from './services/tabs.service';
import { HotkeysService } from './services/hotkeys.service';
import { SplitLayoutProfilesService } from './profiles';
/** @hidden */
export declare class TabManagementContextMenu extends TabContextMenuItemProvider {
    private app;
    private translate;
    weight: number;
    constructor(app: AppService, translate: TranslateService);
    getItems(tab: BaseTabComponent): Promise<MenuItemOptions[]>;
}
/** @hidden */
export declare class CommonOptionsContextMenu extends TabContextMenuItemProvider {
    private app;
    private ngbModal;
    private splitLayoutProfilesService;
    private translate;
    weight: number;
    constructor(app: AppService, ngbModal: NgbModal, splitLayoutProfilesService: SplitLayoutProfilesService, translate: TranslateService);
    getItems(tab: BaseTabComponent, tabHeader?: boolean): Promise<MenuItemOptions[]>;
}
/** @hidden */
export declare class TaskCompletionContextMenu extends TabContextMenuItemProvider {
    private app;
    private translate;
    constructor(app: AppService, translate: TranslateService);
    getItems(tab: BaseTabComponent): Promise<MenuItemOptions[]>;
}
/** @hidden */
export declare class ProfilesContextMenu extends TabContextMenuItemProvider {
    private profilesService;
    private tabsService;
    private app;
    private translate;
    weight: number;
    constructor(profilesService: ProfilesService, tabsService: TabsService, app: AppService, translate: TranslateService, hotkeys: HotkeysService);
    switchTabProfile(tab: BaseTabComponent): Promise<void>;
    getItems(tab: BaseTabComponent): Promise<MenuItemOptions[]>;
}
