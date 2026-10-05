import { BaseTabComponent } from '../components/baseTab.component';
import { MenuItemOptions } from './menu';
/**
 * Extend to add items to the tab header's context menu
 */
export declare abstract class TabContextMenuItemProvider {
    weight: number;
    abstract getItems(tab: BaseTabComponent, tabHeader?: boolean): Promise<MenuItemOptions[]>;
}
