'use strict';

import { Command } from './@types';
import { Phil } from '../phil/phil';
import { HelpGroup } from '../phil/help-groups';
import { IPublicMessage } from 'phil';
import { BotUtils } from '../phil/utils';
import { Feature, FeatureUtils } from '../phil/features';

export class EnableCommand implements Command {
    readonly name = 'enable';
    readonly aliases : string[] = [];
    readonly feature : Feature = null;

    readonly helpGroup = HelpGroup.Admin;
    readonly helpDescription = 'Enables a feature of Phil\'s.';

    readonly versionAdded = 9;

    readonly isAdminCommand = true;
    async processMessage(phil : Phil, message : IPublicMessage, commandArgs : string[]) : Promise<any> {
        if (commandArgs.length < 1) {
            throw new Error('This function requires specifying the name of the feature that you wish enabled.');
        }

        const feature = FeatureUtils.getByName(commandArgs[0]);
        if (!feature) {
            const errorMessage = FeatureUtils.getUnknownFeatureNameErrorMessage(commandArgs[0]);
            throw new Error(errorMessage);
        }

        await feature.setIsEnabled(phil.db, message.server.id, true);

        await BotUtils.sendSuccessMessage({
            bot: phil.bot,
            channelId: message.channelId,
            message: 'The **' + feature.displayName + '** feature is no longer disabled. You can disable this feature by using `' + message.serverConfig.commandPrefix + 'disable`.'
        });
    }
};
