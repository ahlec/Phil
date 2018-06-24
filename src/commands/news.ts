import { IPublicMessage } from 'phil';
import Feature from '../phil/features/feature';
import { HelpGroup } from '../phil/help-groups';
import Phil from '../phil/phil';
import { BotUtils } from '../phil/utils';
import { DiscordPromises } from '../promises/discord';
import ICommand from './@types';

export default class NewsCommand implements ICommand {
    public readonly name = 'news';
    public readonly aliases: ReadonlyArray<string> = [];
    public readonly feature: Feature = null;

    public readonly helpGroup = HelpGroup.Admin;
    public readonly helpDescription = 'Has Phil echo the message provided in the news channel.';

    public readonly versionAdded = 11;

    public readonly isAdminCommand = true;
    public async processMessage(phil: Phil, message: IPublicMessage, commandArgs: ReadonlyArray<string>): Promise<any> {
        const echoedMessage = this.getEchoedStatementFromCommandArgs(message, commandArgs);
        DiscordPromises.sendMessage(phil.bot, message.serverConfig.newsChannel.id, echoedMessage);
    }

    private getEchoedStatementFromCommandArgs(message: IPublicMessage, commandArgs: ReadonlyArray<string>): string {
        let echoedMessage = commandArgs.join(' ').trim();
        echoedMessage = echoedMessage.replace(/`/g, '');

        if (echoedMessage.length === 0) {
            throw new Error('You must provide a message to this function that you would like Phil to repeat in #news. For instance, `' + message.serverConfig.commandPrefix + 'news A New Guardian has been Chosen!`');
        }

        return echoedMessage;
    }
};
