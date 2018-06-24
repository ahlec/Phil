import IStage from './@stage';

import { IPrivateMessage, IPublicMessage, IServerConfig } from 'phil';
import { DiscordPromises } from '../../../promises/discord';
import Database from '../../database';
import Phil from '../../phil';

export default class DeclinedStage implements IStage {
    public readonly stageNumber = 6;

    public async getMessage(db: Database, userId: string): Promise<string> {
        const NOWRAP = '';
        return `Understood. I\'ve made a note that you don\'t want to provide this ${
            NOWRAP}information at this time. I won\'t bother you again. If you ever change ${
            NOWRAP}your mind, feel free to start the questionnaire again.`;
    }

    public async processInput(phil: Phil, message: IPrivateMessage): Promise<any> {
        throw new Error('There is nothing to process when the user has declined the questionnaire.');
    }
}
