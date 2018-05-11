'use strict';

import { Analyzer } from './@types';
import { Phil } from '../phil/phil';
import { DiscordMessage } from '../phil/discord-message';
import { DiscordPromises } from '../promises/discord';
import { TimezoneQuestionnaire } from '../phil/timezone-questionnaire';

export class TimezoneQuestionnaireAnalyzer implements Analyzer {
    readonly handle = 'timezone-questionnaire';

    async process(phil : Phil, message : DiscordMessage) {
        if (!message.isDirectMessage) {
            return;
        }

        const currentStage = await TimezoneQuestionnaire.getStageForUser(phil.db, message.userId);
        if (!currentStage) {
            return;
        }

        if (!TimezoneQuestionnaire.isCurrentlyDoingQuestionnaire(currentStage.stage)) {
            return;
        }

        currentStage.processInput(phil, message);
    }
}
