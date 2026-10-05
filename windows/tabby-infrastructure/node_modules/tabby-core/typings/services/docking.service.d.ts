import { Observable, Subject } from 'rxjs';
export declare abstract class Screen {
    id: number;
    name?: string;
}
export declare abstract class DockingService {
    get screensChanged$(): Observable<void>;
    protected screensChanged: Subject<void>;
    abstract dock(): void;
    abstract getScreens(): Screen[];
}
