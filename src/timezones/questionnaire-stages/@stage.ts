import Database from '@phil/database';
import ReceivedDirectMessage from '@phil/discord/ReceivedDirectMessage';
import Phil from '@phil/phil';

export default interface Stage {
  readonly stageNumber: number;
  getMessage(db: Database, userId: string): Promise<string>;
  processInput(phil: Phil, message: ReceivedDirectMessage): Promise<void>;
}
