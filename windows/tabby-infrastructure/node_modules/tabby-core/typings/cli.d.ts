import { HostAppService } from './api/hostApp';
import { CLIHandler, CLIEvent } from './api/cli';
import { HostWindowService } from './api/hostWindow';
import { ProfilesService } from './services/profiles.service';
export declare class ProfileCLIHandler extends CLIHandler {
    private profiles;
    private hostWindow;
    firstMatchOnly: boolean;
    priority: number;
    constructor(profiles: ProfilesService, hostWindow: HostWindowService);
    handle(event: CLIEvent): Promise<boolean>;
    private handleOpenProfile;
    private handleOpenRecentProfile;
    private handleOpenQuickConnect;
}
export declare class LastCLIHandler extends CLIHandler {
    private hostApp;
    firstMatchOnly: boolean;
    priority: number;
    constructor(hostApp: HostAppService);
    handle(event: CLIEvent): Promise<boolean>;
}
