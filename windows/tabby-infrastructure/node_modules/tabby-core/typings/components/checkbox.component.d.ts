import { ControlValueAccessor } from '@angular/forms';
/** @hidden */
export declare class CheckboxComponent implements ControlValueAccessor {
    model: boolean;
    disabled: boolean;
    text: string;
    private changed;
    click(): void;
    writeValue(obj: any): void;
    registerOnChange(fn: any): void;
    registerOnTouched(fn: any): void;
    setDisabledState(isDisabled: boolean): void;
}
