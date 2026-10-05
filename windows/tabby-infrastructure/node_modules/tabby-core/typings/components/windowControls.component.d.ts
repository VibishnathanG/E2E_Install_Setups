import { HostWindowService } from '../api/hostWindow';
import { AppService } from '../services/app.service';
/** @hidden */
export declare class WindowControlsComponent {
    hostWindow: HostWindowService;
    app: AppService;
    constructor(hostWindow: HostWindowService, app: AppService);
    closeWindow(): Promise<void>;
}
