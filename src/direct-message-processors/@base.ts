import { IPrivateMessage } from 'phil';
import Phil from '../phil/phil';

export interface IProcessorActiveToken { // TODO: come up with a better name for this
    readonly isActive : boolean;
}

export interface IDirectMessageProcessor {
    readonly handle : string;
    canProcess(phil : Phil, message : IPrivateMessage) : Promise<IProcessorActiveToken>;
    process(phil : Phil, message : IPrivateMessage, token : IProcessorActiveToken) : Promise<void>;
}
