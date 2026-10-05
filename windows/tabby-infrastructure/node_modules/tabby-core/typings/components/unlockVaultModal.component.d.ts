import { ElementRef } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
/** @hidden */
export declare class UnlockVaultModalComponent {
    private modalInstance;
    passphrase: string;
    rememberFor: number;
    rememberOptions: number[];
    input: ElementRef;
    constructor(modalInstance: NgbActiveModal);
    ngOnInit(): void;
    ok(): void;
    cancel(): void;
    getRememberForDisplay(rememberOption: number): string;
}
