export declare const metaKeyName: any;
export declare const altKeyName: any;
export interface KeyEventData {
    ctrlKey?: boolean;
    metaKey?: boolean;
    altKey?: boolean;
    shiftKey?: boolean;
    key: string;
    code: string;
    eventName: string;
    time: number;
    registrationTime: number;
}
export type KeyName = string;
export type Keystroke = string;
export declare function getKeyName(event: KeyEventData): KeyName;
export declare function getKeystrokeName(keys: KeyName[]): Keystroke;
