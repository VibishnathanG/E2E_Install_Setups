import { ConfigService, NewTabParameters, PartialProfile, Profile, ProfileProvider } from './api';
import { SplitTabComponent, SplitTabRecoveryProvider } from './components/splitTab.component';
export interface SplitLayoutProfileOptions {
    recoveryToken: any;
}
export interface SplitLayoutProfile extends Profile {
    options: SplitLayoutProfileOptions;
}
export declare class SplitLayoutProfilesService extends ProfileProvider<SplitLayoutProfile> {
    private splitTabRecoveryProvider;
    private config;
    id: string;
    name: "Saved layout";
    configDefaults: {
        options: {
            recoveryToken: null;
        };
    };
    constructor(splitTabRecoveryProvider: SplitTabRecoveryProvider, config: ConfigService);
    getBuiltinProfiles(): Promise<PartialProfile<SplitLayoutProfile>[]>;
    getNewTabParameters(profile: SplitLayoutProfile): Promise<NewTabParameters<SplitTabComponent>>;
    getDescription(): string;
    createProfile(tab: SplitTabComponent, name: string): Promise<void>;
}
