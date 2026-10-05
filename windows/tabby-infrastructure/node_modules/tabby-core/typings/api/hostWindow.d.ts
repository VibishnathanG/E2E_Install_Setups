import { Observable, Subject } from 'rxjs';
export declare abstract class HostWindowService {
    /**
     * Fired once the window is visible
     */
    get windowShown$(): Observable<void>;
    /**
     * Fired when the window close button is pressed
     */
    get windowCloseRequest$(): Observable<void>;
    get windowMoved$(): Observable<void>;
    get windowFocused$(): Observable<void>;
    protected windowShown: Subject<void>;
    protected windowCloseRequest: Subject<void>;
    protected windowMoved: Subject<void>;
    protected windowFocused: Subject<void>;
    abstract readonly isFullscreen: boolean;
    abstract reload(): void;
    abstract setTitle(title?: string): void;
    abstract toggleFullscreen(): void;
    abstract minimize(): void;
    abstract isMaximized(): boolean;
    abstract toggleMaximize(): void;
    abstract close(): void;
    openDevTools(): void;
    bringToFront(): void;
}
