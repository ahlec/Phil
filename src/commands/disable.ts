import Feature from '../features/feature';
import FeatureUtils from '../features/feature-utils';
import { HelpGroup } from '../help-groups';
import PublicMessage from '../messages/public';
import PermissionLevel from '../permission-level';
import Phil from '../phil';
import { BotUtils } from '../utils';
import ICommand from './@types';

export default class DisableCommand implements ICommand {
    public readonly name = 'disable';
    public readonly aliases: ReadonlyArray<string> = [];
    public readonly feature: Feature = null;
    public readonly permissionLevel = PermissionLevel.AdminOnly;

    public readonly helpGroup = HelpGroup.Admin;
    public readonly helpDescription = 'Disables a feature of Phil\'s.';

    public readonly versionAdded = 9;

    public async processMessage(phil: Phil, message: PublicMessage, commandArgs: ReadonlyArray<string>): Promise<any> {
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
