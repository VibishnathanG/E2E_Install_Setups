/// <reference types="node" />
import { NgZone } from '@angular/core';
import { Observable } from 'rxjs';
import { SelectorService } from './selector.service';
import { FileProvider } from '../api/fileProvider';
import { PlatformService } from '../api/platform';
export interface StoredVault {
    version: number;
    contents: string;
    keySalt: string;
    iv: string;
}
export interface VaultSecret {
    type: string;
    key: VaultSecretKey;
    value: string;
}
export interface VaultFileSecret extends VaultSecret {
    key: {
        id: string;
        description: string;
    };
}
export interface Vault {
    config: any;
    secrets: VaultSecret[];
}
export interface VaultSecretKey {
}
export declare const VAULT_SECRET_TYPE_FILE = "file";
export declare class VaultService {
    private zone;
    private notifications;
    private ngbModal;
    /** Fires once when the config is loaded */
    get ready$(): Observable<boolean>;
    get contentChanged$(): Observable<void>;
    store: StoredVault | null;
    private ready;
    private contentChanged;
    /** @hidden */
    private constructor();
    setEnabled(enabled: boolean, passphrase?: string): Promise<void>;
    isOpen(): boolean;
    forgetPassphrase(): void;
    decrypt(storage: StoredVault, passphrase?: string): Promise<Vault>;
    load(passphrase?: string): Promise<Vault | null>;
    encrypt(vault: Vault, passphrase?: string): Promise<StoredVault | null>;
    save(vault: Vault, passphrase?: string): Promise<void>;
    getPassphrase(): Promise<string>;
    getSecret(type: string, key: VaultSecretKey): Promise<VaultSecret | null>;
    addSecret(secret: VaultSecret): Promise<void>;
    updateSecret(secret: VaultSecret, update: VaultSecret): Promise<void>;
    removeSecret(type: string, key: VaultSecretKey): Promise<void>;
    private keyMatches;
    setStore(store: StoredVault): void;
    isEnabled(): boolean;
}
export declare class VaultFileProvider extends FileProvider {
    private vault;
    private platform;
    private selector;
    private zone;
    name: string;
    prefix: string;
    constructor(vault: VaultService, platform: PlatformService, selector: SelectorService, zone: NgZone);
    isAvailable(): Promise<boolean>;
    selectAndStoreFile(description: string): Promise<string>;
    addNewFile(description: string): Promise<string>;
    retrieveFile(key: string): Promise<Buffer>;
}
