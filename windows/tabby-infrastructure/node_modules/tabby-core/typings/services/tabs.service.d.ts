import { BaseTabComponent } from '../components/baseTab.component';
export interface TabComponentType<T extends BaseTabComponent> {
    new (...args: any[]): T;
}
export interface NewTabParameters<T extends BaseTabComponent> {
    /**
     * Component type to be instantiated
     */
    type: TabComponentType<T>;
    /**
     * Component instance inputs
     */
    inputs?: Record<string, any>;
}
export declare class TabsService {
    private componentFactoryResolver;
    private injector;
    private tabRecovery;
    /** @hidden */
    private constructor();
    /**
     * Instantiates a tab component and assigns given inputs
     */
    create<T extends BaseTabComponent>(params: NewTabParameters<T>): T;
    /**
     * Duplicates an existing tab instance (using the tab recovery system)
     */
    duplicate(tab: BaseTabComponent): Promise<BaseTabComponent | null>;
}
