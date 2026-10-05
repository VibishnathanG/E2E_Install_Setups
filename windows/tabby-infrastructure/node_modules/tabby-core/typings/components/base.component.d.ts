import { Observable } from 'rxjs';
export declare class SubscriptionContainer {
    private subscriptions;
    private events;
    isEmpty(): boolean;
    addEventListener(element: HTMLElement, event: string, handler: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;
    subscribe<T>(observable: Observable<T>, handler: (v: T) => void): void;
    cancelAll(): void;
}
export declare class BaseComponent {
    protected get destroyed$(): Observable<void>;
    private _destroyed;
    private _subscriptionContainer;
    addEventListenerUntilDestroyed(element: HTMLElement, event: string, handler: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;
    subscribeUntilDestroyed<T>(observable: Observable<T>, handler: (v: T) => void): void;
    ngOnDestroy(): void;
}
