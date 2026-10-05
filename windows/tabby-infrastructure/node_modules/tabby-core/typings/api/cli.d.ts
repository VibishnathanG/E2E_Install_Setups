export interface CLIEvent {
    argv: any;
    cwd: string;
    secondInstance: boolean;
}
export declare abstract class CLIHandler {
    priority: number;
    firstMatchOnly: boolean;
    abstract handle(event: CLIEvent): Promise<boolean>;
}
