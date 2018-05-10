import { Phil } from '../phil/phil';
import { ServerConfig } from '../phil/server-config';

export interface Chrono {
    readonly handle : string;

    process(phil : Phil, serverConfig : ServerConfig, now : Date) : Promise<void>;
}

export interface IChronoLookup {
    [chronoHandle : string] : Chrono;
}
