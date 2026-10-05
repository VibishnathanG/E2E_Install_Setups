import { RecoveryToken } from '../api/tabRecovery';
import { BaseTabComponent, GetRecoveryTokenOptions } from '../components/baseTab.component';
import { Logger } from './log.service';
import { NewTabParameters } from './tabs.service';
/** @hidden */
export declare class TabRecoveryService {
    private tabRecoveryProviders;
    private config;
    logger: Logger;
    enabled: boolean;
    private constructor();
    saveTabs(tabs: BaseTabComponent[]): Promise<void>;
    getFullRecoveryToken(tab: BaseTabComponent, options?: GetRecoveryTokenOptions): Promise<RecoveryToken | null>;
    recoverTab(token: RecoveryToken): Promise<NewTabParameters<BaseTabComponent> | null>;
    recoverTabs(): Promise<NewTabParameters<BaseTabComponent>[]>;
}
