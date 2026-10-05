/// <reference types="node" />
export declare abstract class FileProvider {
    name: string;
    isAvailable(): Promise<boolean>;
    abstract selectAndStoreFile(description: string): Promise<string>;
    abstract retrieveFile(key: string): Promise<Buffer>;
}
