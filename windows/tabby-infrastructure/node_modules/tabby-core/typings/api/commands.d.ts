import { BaseTabComponent } from '../components/baseTab.component';
import { MenuItemOptions } from './menu';
import { ToolbarButton } from './toolbarButtonProvider';
export declare enum CommandLocation {
    LeftToolbar = "left-toolbar",
    RightToolbar = "right-toolbar",
    StartPage = "start-page"
}
export declare class Command {
    id?: string;
    label: string;
    sublabel?: string;
    locations?: CommandLocation[];
    run: () => Promise<void>;
    /**
     * Raw SVG icon code
     */
    icon?: string;
    /**
     * Optional Touch Bar icon ID
     */
    touchBarNSImage?: string;
    /**
     * Optional Touch Bar button label
     */
    touchBarTitle?: string;
    weight?: number;
    static fromToolbarButton(button: ToolbarButton): Command;
    static fromMenuItem(item: MenuItemOptions): Command;
}
export interface CommandContext {
    tab?: BaseTabComponent;
}
/**
 * Extend to add commands
 */
export declare abstract class CommandProvider {
    abstract provide(context: CommandContext): Promise<Command[]>;
}
