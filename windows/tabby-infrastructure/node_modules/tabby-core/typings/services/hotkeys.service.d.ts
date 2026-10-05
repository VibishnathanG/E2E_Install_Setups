import { EventEmitter } from '@angular/core';
import { Observable } from 'rxjs';
import { HotkeyDescription } from '../api/hotkeyProvider';
import { Keystroke, KeyName } from './hotkeys.util';
export interface PartialHotkeyMatch {
    id: string;
    strokes: string[];
    matchedLength: number;
}
export declare class HotkeysService {
    private zone;
    private config;
    private hotkeyProviders;
    /** @hidden @deprecated */
    key: EventEmitter<KeyboardEvent>;
    /** @hidden @deprecated */
    matchedHotkey: EventEmitter<string>;
    /**
     * Fired for each recognized hotkey
     */
    get unfilteredHotkey$(): Observable<string>;
    /**
     * Fired for each recognized hotkey
     */
    get hotkey$(): Observable<string>;
    /**
     * Fired for once hotkey is released
     */
    get hotkeyOff$(): Observable<string>;
    /**
     * Fired for each singular key
     */
    get key$(): Observable<KeyName>;
    /**
     * Fired for each key event
     */
    get keyEvent$(): Observable<KeyboardEvent>;
    /**
     * Fired for each singular key combination
     */
    get keystroke$(): Observable<Keystroke>;
    private _hotkey;
    private _hotkeyOff;
    private _keyEvent;
    private _key;
    private _keystroke;
    private disabledLevel;
    private hotkeyDescriptions;
    private pressedKeys;
    private pressedKeyTimestamps;
    private pressedHotkey;
    private pressedKeystroke;
    private lastKeystrokes;
    private recognitionPhase;
    private lastEventTimestamp;
    private constructor();
    /**
     * Adds a new key event to the buffer
     *
     * @param eventName DOM event name
     * @param nativeEvent event object
     */
    pushKeyEvent(eventName: string, nativeEvent: KeyboardEvent): void;
    getCurrentKeystrokes(): Keystroke[];
    matchActiveHotkey(partial?: boolean): string | null;
    clearCurrentKeystrokes(): void;
    getHotkeyDescription(id: string): HotkeyDescription;
    enable(): void;
    disable(): void;
    isEnabled(): boolean;
    getHotkeyDescriptions(): Promise<HotkeyDescription[]>;
    private updateModifiers;
    private emitHotkeyOn;
    private emitHotkeyOff;
    private getHotkeysConfig;
    private getHotkeysConfigRecursive;
    private addPressedKey;
    private removePressedKey;
}
