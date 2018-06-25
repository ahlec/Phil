import Feature from '../features/feature';
import FeatureUtils from '../features/feature-utils';
import { HelpGroup } from '../help-groups';
import PublicMessage from '../messages/public';
import Phil from '../phil';
import BotUtils from '../utils';
import ICommand from './@types';

export default class EnableCommand implements ICommand {
    public readonly name = 'enable';
    public readonly aliases: ReadonlyArray<string> = [];
    public readonly feature: Feature = null;

    public readonly helpGroup = HelpGroup.Admin;
    public readonly helpDescription = 'Enables a feature of Phil\'s.';

    public readonly versionAdded = 9;

    public readonly isAdminCommand = true;
    public async processMessage(phil: Phil, message: PublicMessage, commandArgs: ReadonlyArray<string>): Promise<any> {
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
