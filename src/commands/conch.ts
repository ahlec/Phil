import { IPublicMessage } from 'phil';
import Feature from '../phil/features/feature';
import { HelpGroup } from '../phil/help-groups';
import Phil from '../phil/phil';
import { BotUtils } from '../phil/utils';
import { DiscordPromises } from '../promises/discord';
import ICommand from './@types';

const conchReplies = [
    'Maybe someday',
    'Nothing',
    'Neither',
    'Follow the seahorse',
    'I don\'t think so',
    'No',
    'No',
    'No',
    'Yes',
    'Try asking again',
    'Try asking again'
];

export default class ConchCommand implements ICommand {
    public readonly name = 'conch';
    public readonly aliases = ['magicconch', 'mc'];
    public readonly feature: Feature = null;

    public readonly helpGroup = HelpGroup.Memes;
    public readonly helpDescription = 'The Magic Conch says...';

    public readonly versionAdded = 3;

    public readonly isAdminCommand = false;
    public async processMessage(phil: Phil, message: IPublicMessage, commandArgs: ReadonlyArray<string>) : Promise<any> {
        const conchReply = BotUtils.getRandomArrayEntry(conchReplies);
        const reply = ':shell: The Magic Conch Shell says: **' + conchReply + '**.';

        return DiscordPromises.sendMessage(phil.bot, message.channelId, reply);
    }
};
