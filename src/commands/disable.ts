import { Client as DiscordIOClient } from 'discord.io';
import { IPublicMessage } from 'phil';
import Feature from '../phil/features/feature';
import FeatureUtils from '../phil/features/feature-utils';
import { HelpGroup } from '../phil/help-groups';
import Phil from '../phil/phil';
import { BotUtils } from '../phil/utils';
import ICommand from './@types';

export default class DisableCommand implements ICommand {
    public readonly name = 'disable';
    public readonly aliases: ReadonlyArray<string> = [];
    public readonly feature: Feature = null;

    public readonly helpGroup = HelpGroup.Admin;
    public readonly helpDescription = 'Disables a feature of Phil\'s.';

    public readonly versionAdded = 9;

    public readonly isAdminCommand = true;
    public async processMessage(phil: Phil, message: IPublicMessage, commandArgs: ReadonlyArray<string>): Promise<any> {
        if (commandArgs.length < 1) {
            throw new Error('This function requires specifying the name of the feature that you wish disabled.');
        }

        const feature = FeatureUtils.getByName(commandArgs[0]);
        if (!feature) {
            const errorMessage = FeatureUtils.getUnknownFeatureNameErrorMessage(commandArgs[0]);
            throw new Error(errorMessage);
        }

        await feature.setIsEnabled(phil.db, message.server.id, false);

        await BotUtils.sendSuccessMessage({
            bot: phil.bot,
            channelId: message.channelId,
            message: 'The **' + feature.displayName + '** feature is now disabled. You can enable this feature by using `' + message.serverConfig.commandPrefix + 'enable`.'
        });
    }
};
