/// <reference types="node" />
import { FileProvider } from '../api';
export declare class FileProvidersService {
    private selector;
    private notifications;
    private translate;
    private fileProviders;
    /** @hidden */
    private constructor();
    selectAndStoreFile(description: string): Promise<string>;
    retrieveFile(key: string): Promise<Buffer>;
    selectProvider(): Promise<FileProvider>;
}
