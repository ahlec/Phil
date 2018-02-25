'use strict';

import { Command } from './@types';
import { HelpGroup } from '../phil/help-groups';
import { Client as DiscordIOClient } from 'discord.io';
import { DiscordMessage } from '../phil/discord-message';
import { Database } from '../phil/database';
import { BotUtils } from '../phil/utils';
import { Feature, FeatureUtils } from '../phil/features';

export class EnableCommand implements Command {
    readonly name = 'enable';
    readonly aliases : string[] = [];
    readonly feature : Feature = null;

    readonly helpGroup = HelpGroup.Admin;
    readonly helpDescription = 'Enables a feature of Phil\'s.';

    readonly versionAdded = 9;

    readonly publicRequiresAdmin = true;
    async processPublicMessage(bot : DiscordIOClient, message : DiscordMessage, commandArgs : string[], db : Database) : Promise<any> {
        if (commandArgs.length < 1) {
            throw new Error('This function requires specifying the name of the feature that you wish enabled.');
        }

        const feature = FeatureUtils.getByName(commandArgs[0]);
        if (!feature) {
            const errorMessage = FeatureUtils.getUnknownFeatureNameErrorMessage(commandArgs[0]);
            throw new Error(errorMessage);
        }

        await feature.setIsEnabled(db, message.server.id, true);

        await BotUtils.sendSuccessMessage({
            bot: bot,
            channelId: message.channelId,
            message: 'The **' + feature.displayName + '** feature is no longer disabled. You can disable this feature by using `' + process.env.COMMAND_PREFIX + 'disable`.'
        });
    }
};
