export declare abstract class UpdaterService {
    abstract check(): Promise<boolean>;
    abstract update(): Promise<void>;
}
