import { Phil } from '../phil/phil';
import { IPrivateMessage } from 'phil';

export interface IProcessorActiveToken { // TODO: come up with a better name for this
    readonly isActive : boolean;
}

export interface DirectMessageProcessor {
    readonly handle : string;
    canProcess(phil : Phil, message : IPrivateMessage) : Promise<IProcessorActiveToken>;
    process(phil : Phil, message : IPrivateMessage, token : IProcessorActiveToken) : Promise<void>;
}
