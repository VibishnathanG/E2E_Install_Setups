import { Observable, Subject, BehaviorSubject } from 'rxjs';
import { EmbeddedViewRef, Injector, ViewContainerRef, ViewRef } from '@angular/core';
import { RecoveryToken } from '../api/tabRecovery';
import { BaseComponent } from './base.component';
import { ConfigService } from '../services/config.service';
/**
 * Represents an active "process" inside a tab,
 * for example, a user process running inside a terminal tab
 */
export interface BaseTabProcess {
    name: string;
}
export interface GetRecoveryTokenOptions {
    includeState: boolean;
}
/**
 * Abstract base class for custom tab components
 */
export declare abstract class BaseTabComponent extends BaseComponent {
    /**
     * Parent tab (usually a SplitTabComponent)
     */
    parent: BaseTabComponent | null;
    /**
     * Current tab title
     */
    title: string;
    /**
     * User-defined title override
     */
    customTitle: string;
    /**
     * Last tab activity state
     */
    hasActivity: boolean;
    /**
     * ViewRef to the tab DOM element
     */
    hostView: ViewRef;
    /**
     * CSS color override for the tab's header
     */
    get color(): string | null;
    set color(value: string | null);
    private _color;
    /**
     * icon override for the tab's header
     */
    get icon(): string | null;
    set icon(value: string | null);
    private _icon;
    hasFocus: boolean;
    /**
     * Ping this if your recovery state has been changed and you want
     * your tab state to be saved sooner
     */
    protected recoveryStateChangedHint: Subject<void>;
    protected viewContainer?: ViewContainerRef;
    viewContainerEmbeddedRef?: EmbeddedViewRef<any>;
    private titleChange;
    private focused;
    private blurred;
    protected visibility: BehaviorSubject<boolean>;
    protected progress: BehaviorSubject<number | null>;
    protected activity: BehaviorSubject<boolean>;
    private destroyed;
    private _destroyCalled;
    get focused$(): Observable<void>;
    get blurred$(): Observable<void>;
    get visibility$(): Observable<boolean>;
    get titleChange$(): Observable<string>;
    get progress$(): Observable<number | null>;
    get activity$(): Observable<boolean>;
    get destroyed$(): Observable<void>;
    get recoveryStateChangedHint$(): Observable<void>;
    protected config: ConfigService;
    protected constructor(injector: Injector);
    setTitle(title: string): void;
    /**
     * Sets visual progressbar on the tab
     *
     * @param  {type} progress: value between 0 and 1, or `null` to remove
     */
    setProgress(progress: number | null): void;
    /**
     * Shows the activity marker on the tab header
     */
    displayActivity(): void;
    /**
     * Removes the activity marker from the tab header
     */
    clearActivity(): void;
    /**
     * Override this and implement a [[TabRecoveryProvider]] to enable recovery
     * for your custom tab
     *
     * @return JSON serializable tab state representation
     *         for your [[TabRecoveryProvider]] to parse
     */
    getRecoveryToken(options?: GetRecoveryTokenOptions): Promise<RecoveryToken | null>;
    /**
     * Override this to enable task completion notifications for the tab
     */
    getCurrentProcess(): Promise<BaseTabProcess | null>;
    /**
     * Return false to prevent the tab from being closed
     */
    canClose(): Promise<boolean>;
    emitFocused(): void;
    emitBlurred(): void;
    emitVisibility(visibility: boolean): void;
    insertIntoContainer(container: ViewContainerRef): EmbeddedViewRef<any>;
    removeFromContainer(): void;
    get topmostParent(): BaseTabComponent | null;
    /**
     * Called before the tab is closed
     */
    destroy(skipDestroyedEvent?: boolean): void;
    /** @hidden */
    ngOnDestroy(): void;
}
