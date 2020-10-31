import ReceivedDirectMessage from '@phil/discord/ReceivedDirectMessage';
import Phil from '@phil/phil';

export interface ProcessorActiveToken {
  // TODO: come up with a better name for this
  readonly isActive: boolean;
}

export interface DirectMessageProcessor {
  readonly handle: string;
  canProcess(
    phil: Phil,
    message: ReceivedDirectMessage
  ): Promise<ProcessorActiveToken>;
  process(
    phil: Phil,
    message: ReceivedDirectMessage,
    token: ProcessorActiveToken
  ): Promise<void>;
}
