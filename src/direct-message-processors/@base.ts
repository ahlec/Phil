import PrivateMessage from 'messages/private';
import Phil from 'phil';

export interface IProcessorActiveToken { // TODO: come up with a better name for this
    readonly isActive: boolean;
}

export interface IDirectMessageProcessor {
    readonly handle: string;
    canProcess(phil: Phil, message: PrivateMessage): Promise<IProcessorActiveToken>;
    process(phil: Phil, message: PrivateMessage, token: IProcessorActiveToken): Promise<void>;
}
