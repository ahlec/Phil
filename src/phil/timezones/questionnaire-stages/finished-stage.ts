import IStage from './@stage';

import { IPrivateMessage, IPublicMessage, IServerConfig } from 'phil';
import { DiscordPromises } from '../../../promises/discord';
import Database from '../../database';
import Phil from '../../phil';

export default class FinishedStage implements IStage {
    public readonly stageNumber = 5;

    public async getMessage(db: Database, userId: string): Promise<string> {
        const NOWRAP = '';
        return `All done! I\'ve recorded your timezone information! When you mention a date ${
            NOWRAP}or time in the server again, I\'ll convert it for you! If you ever need to ${
            NOWRAP}change it, just start up the questionnaire again to do so!`;
    }

    public async processInput(phil: Phil, message: IPrivateMessage): Promise<any> {
        throw new Error('There is nothing to process when we\'re finished.');
    }
}
