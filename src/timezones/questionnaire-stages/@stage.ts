import Database from '@phil/database';
import PrivateMessage from '@phil/messages/private';
import Phil from '@phil/phil';

export default interface Stage {
  readonly stageNumber: number;
  getMessage(db: Database, userId: string): Promise<string>;
  processInput(phil: Phil, message: PrivateMessage): Promise<void>;
}
