import { ConfigProvider } from './api/configProvider';
/** @hidden */
export declare class CoreConfigProvider extends ConfigProvider {
    platformDefaults: {
        macOS: any;
        Windows: any;
        Linux: any;
        Web: any;
    };
    defaults: any;
}
