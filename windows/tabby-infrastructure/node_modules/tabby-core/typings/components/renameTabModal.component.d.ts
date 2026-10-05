import { ElementRef } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
/** @hidden */
export declare class RenameTabModalComponent {
    private modalInstance;
    value: string;
    input: ElementRef;
    constructor(modalInstance: NgbActiveModal);
    ngOnInit(): void;
    save(): void;
    close(): void;
}
