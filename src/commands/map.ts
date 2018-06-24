import { IPublicMessage } from 'phil';
import Features from '../phil/features/all-features';
import { HelpGroup } from '../phil/help-groups';
import Phil from '../phil/phil';
import BotUtils from '../phil/utils';
import { DiscordPromises } from '../promises/discord';
import ICommand from './@types';

export default class MapCommand implements ICommand {
    public readonly name = 'map';
    public readonly aliases: ReadonlyArray<string> = [];
    public readonly feature = Features.FandomMap;

    public readonly helpGroup = HelpGroup.General;
    public readonly helpDescription = 'Has Phil provide a link to the editable map of the fandom.';

    public readonly versionAdded = 8;

    public readonly isAdminCommand = false;
    public processMessage(phil: Phil, message: IPublicMessage, commandArgs: ReadonlyArray<string>): Promise<any> {
        if (!message.serverConfig.fandomMapLink) {
            return BotUtils.sendErrorMessage({
                bot: phil.bot,
                channelId: message.channelId,
                message: 'This server has not provided a link to a shared map of the fandom.'
            });
        }

        return DiscordPromises.sendMessage(phil.bot, message.channelId, message.serverConfig.fandomMapLink);
    }
};
