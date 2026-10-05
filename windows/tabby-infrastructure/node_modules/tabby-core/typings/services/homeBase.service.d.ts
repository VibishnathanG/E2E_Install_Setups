export declare class HomeBaseService {
    private config;
    private platform;
    private hostApp;
    private bootstrapData;
    appVersion: string;
    mixpanel: any;
    /** @hidden */
    private constructor();
    openGitHub(): void;
    openDiscord(): void;
    openTranslations(): void;
    reportBug(): void;
    enableAnalytics(): void;
    getAnalyticsProperties(): Record<string, string>;
}
