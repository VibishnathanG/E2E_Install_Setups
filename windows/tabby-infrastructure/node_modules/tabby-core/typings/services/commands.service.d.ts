import { AppService, Command, CommandContext, CommandProvider, ConfigService, TabContextMenuItemProvider, ToolbarButtonProvider, TranslateService } from '../api';
import { SelectorService } from './selector.service';
export declare class CommandService {
    private selector;
    private config;
    private app;
    private translate;
    protected contextMenuProviders: TabContextMenuItemProvider[];
    private toolbarButtonProviders;
    private commandProviders;
    private lastCommand;
    constructor(selector: SelectorService, config: ConfigService, app: AppService, translate: TranslateService, contextMenuProviders: TabContextMenuItemProvider[], toolbarButtonProviders: ToolbarButtonProvider[], commandProviders: CommandProvider[]);
    getCommands(context: CommandContext): Promise<Command[]>;
    run(id: string, context: CommandContext): Promise<void>;
    showSelector(): Promise<void>;
}
