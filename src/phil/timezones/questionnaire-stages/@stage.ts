import { IPrivateMessage, IPublicMessage, IServerConfig } from 'phil';
import Database from '../../database';
import Phil from '../../phil';

export default interface IStage {
    readonly stage: QuestionnaireStage;
    getMessage(db: Database, userId: string): Promise<string>;
    processInput(phil: Phil, message: IPrivateMessage): Promise<any>;
}
