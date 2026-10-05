import { SelectorOption } from '../api/selector';
export declare class SelectorService {
    private ngbModal;
    private current;
    get active(): boolean;
    /** @hidden */
    private constructor();
    show<T>(name: string, options: SelectorOption<T>[]): Promise<T>;
}
