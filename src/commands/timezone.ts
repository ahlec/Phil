'use strict';

import { Command } from './@types';
import { Phil } from '../phil/phil';
import { HelpGroup } from '../phil/help-groups';
import { IPublicMessage } from 'phil';
import { BotUtils } from '../phil/utils';
import { Features } from '../phil/features';
import { TimezoneQuestionnaire } from '../phil/timezone-questionnaire';

export class TimezoneCommand implements Command {
    readonly name = 'timezone';
    readonly aliases = [ 'timezones', 'tz' ];
    readonly feature = Features.TimezoneProcessing;

    readonly helpGroup = HelpGroup.Time;
    readonly helpDescription = 'Begins a private message dialogue with Phil to set your timezone, or to change your current timezone.';

    readonly versionAdded = 8;

    readonly isAdminCommand = false;
    processMessage(phil : Phil, message : IPublicMessage, commandArgs : string[]) : Promise<any> {
        return TimezoneQuestionnaire.startQuestionnaire(phil, message.userId, true);
    }
};
