import Phil from '../phil';
import ServerConfig from '../server-config';

export default interface IChrono {
    readonly handle: string;

    process(phil: Phil, serverConfig: ServerConfig, now: Date): Promise<void>;
}

export interface IChronoLookup {
    [chronoHandle: string]: IChrono;
}
