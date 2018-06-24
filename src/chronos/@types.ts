import Phil from '../phil/phil';
import ServerConfig from '../phil/server-config';

export default interface IChrono {
    readonly handle: string;

    process(phil: Phil, serverConfig: ServerConfig, now: Date): Promise<void>;
}

export interface IChronoLookup {
    [chronoHandle: string]: IChrono;
}
