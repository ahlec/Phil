import Stages from './@all-stages';
import IStage from './@stage';
import { CountryTimezones, ITimezoneData } from './@timezone-data';
import QuestionnaireStageUtils from './@utils';

import { IPrivateMessage, IPublicMessage, IServerConfig } from 'phil';
import { DiscordPromises } from '../../../promises/discord';
import Database from '../../database';
import Phil from '../../phil';

export default class CountryStage implements IStage {
    public readonly stageNumber = 2;

    public async getMessage(db: Database, userId: string): Promise<string> {
        return 'Alright! Let\'s get started! Can you start by telling me the name of the country you\'re in? I\'ll never display this information publicly in the chat.';
    }

    public async processInput(phil: Phil, message: IPrivateMessage): Promise<any> {
        const input = message.content.trim().toLowerCase();
        const timezoneData = CountryTimezones[input];

        if (!timezoneData) {
            DiscordPromises.sendMessage(phil.bot, message.channelId, 'I\'m not sure what country that was. I can understand a country by a couple of names, but the easiest is the standard English name of the country.');
            return;
        }

        if (timezoneData.timezones.length === 1) {
            QuestionnaireStageUtils.setTimezone(phil, message.userId, timezoneData.timezones[0].name);
            return;
        }

        const results = await phil.db.query('UPDATE timezones SET country_name = $1 WHERE userid = $2', [input, message.userId]);
        if (results.rowCount === 0) {
            throw new Error('Could not set the country_name field in the database.');
        }

        QuestionnaireStageUtils.setStage(phil, message.userId, Stages.Specification);
    }
}
