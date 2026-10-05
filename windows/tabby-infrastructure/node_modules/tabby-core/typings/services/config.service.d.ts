import { Observable } from 'rxjs';
export declare const configMerge: (a: any, b: any) => any;
export declare const configMergeByDefault: (a: any, b: any) => any;
/** @hidden */
export declare class ConfigProxy {
    constructor(real: Record<string, any>, defaults: Record<string, any>);
    __getValue(_key: string): any;
    __setValue(_key: string, _value: any): void;
    __getDefault(_key: string): any;
    __cleanup(): void;
}
export declare class ConfigService {
    private hostApp;
    private platform;
    private vault;
    private translate;
    private configProviders;
    /**
     * Contains the actual config values
     */
    store: any;
    /**
     * Whether an app restart is required due to recent changes
     */
    restartRequested: boolean;
    /** Fires once when the config is loaded */
    get ready$(): Observable<boolean>;
    private ready;
    private changed;
    private _store;
    private defaults;
    private servicesCache;
    get changed$(): Observable<void>;
    /** @hidden */
    private constructor();
    mergeDefaults(): unknown;
    getDefaults(): Record<string, any>;
    load(): Promise<void>;
    save(): Promise<void>;
    /**
     * Reads config YAML as string
     */
    readRaw(): string;
    /**
     * Writes config YAML as string
     */
    writeRaw(data: string): Promise<void>;
    requestRestart(): void;
    /**
     * Filters a list of Angular services to only include those provided
     * by plugins that are enabled
     *
     * @typeparam T Base provider type
     */
    enabledServices<T extends object>(services: T[] | undefined): T[];
    private init;
    private emitChange;
    private migrate;
    private maybeDecryptConfig;
    private maybeEncryptConfig;
}
