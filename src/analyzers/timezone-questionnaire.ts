'use strict';

import { Analyzer } from './@types';
import { Client as DiscordIOClient } from 'discord.io';
import { DiscordMessage } from '../phil/discord-message';
import { Database } from '../phil/database';
import { DiscordPromises } from '../promises/discord';
import { TimezoneQuestionnaire } from '../phil/timezone-questionnaire';

export class TimezoneQuestionnaireAnalyzer implements Analyzer {
    readonly handle = 'timezone-questionnaire';

    async process(bot : DiscordIOClient, message : DiscordMessage, db : Database) {
        if (!message.isDirectMessage) {
            return;
        }

        const currentStage = await TimezoneQuestionnaire.getStageForUser(db, message.userId);
        if (!currentStage) {
            return;
        }

        if (!TimezoneQuestionnaire.isCurrentlyDoingQuestionnaire(currentStage.stage)) {
            return;
        }

        currentStage.processInput(bot, db, message);
    }
}
