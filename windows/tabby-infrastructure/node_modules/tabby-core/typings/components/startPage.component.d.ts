import { DomSanitizer } from '@angular/platform-browser';
import { HomeBaseService } from '../services/homeBase.service';
import { CommandService } from '../services/commands.service';
import { Command } from '../api/commands';
/** @hidden */
export declare class StartPageComponent {
    private domSanitizer;
    homeBase: HomeBaseService;
    version: string;
    commands: Command[];
    constructor(domSanitizer: DomSanitizer, homeBase: HomeBaseService, commands: CommandService);
    sanitizeIcon(icon?: string): any;
    buttonsTrackBy(_: any, btn: Command): any;
}
