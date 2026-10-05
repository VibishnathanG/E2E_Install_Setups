export declare abstract class Logger {
    protected name: string;
    constructor(name: string);
    debug(...args: any[]): void;
    info(...args: any[]): void;
    warn(...args: any[]): void;
    error(...args: any[]): void;
    log(...args: any[]): void;
    protected abstract doLog(level: string, ...args: any[]): void;
}
export declare class ConsoleLogger extends Logger {
    protected doLog(level: string, ...args: any[]): void;
}
export declare abstract class LogService {
    abstract create(name: string): Logger;
}
