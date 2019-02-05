import PrivateMessage from '../messages/private';
import Phil from '../phil';

export interface ProcessorActiveToken {
  // TODO: come up with a better name for this
  readonly isActive: boolean;
}

export interface DirectMessageProcessor {
  readonly handle: string;
  canProcess(
    phil: Phil,
    message: PrivateMessage
  ): Promise<ProcessorActiveToken>;
  process(
    phil: Phil,
    message: PrivateMessage,
    token: ProcessorActiveToken
  ): Promise<void>;
}
