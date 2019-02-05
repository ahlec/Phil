import Database from '../../database';
import PrivateMessage from '../../messages/private';
import Phil from '../../phil';

export default interface Stage {
  readonly stageNumber: number;
  getMessage(db: Database, userId: string): Promise<string>;
  processInput(phil: Phil, message: PrivateMessage): Promise<any>;
}
