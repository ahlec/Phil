import Feature from '../features/feature';
import { HelpGroup } from '../help-groups';
import PublicMessage from '../messages/public';
import Phil from '../phil';
import { DiscordPromises } from '../promises/discord';
import BotUtils from '../utils';
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
    public async processMessage(phil: Phil, message: PublicMessage, commandArgs: ReadonlyArray<string>) : Promise<any> {
        const conchReply = BotUtils.getRandomArrayEntry(conchReplies);
        const reply = ':shell: The Magic Conch Shell says: **' + conchReply + '**.';

        return DiscordPromises.sendMessage(phil.bot, message.channelId, reply);
    }
};
