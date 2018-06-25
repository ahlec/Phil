import Feature from '../features/feature';
import { HelpGroup } from '../help-groups';
import PublicMessage from '../messages/public';
import Phil from '../phil';
import { DiscordPromises } from '../promises/discord';
import BotUtils from '../utils';
import ICommand from './@types';

const apologies = [
    'I am incredibly sorry for my mistake.',
    'Es tut mir aber leid, dass ich ein schlechte Yeti war.',
    'We all make mistakes, and I made a horrible one. I\'m sincerely sorry.',
    'I apologise for my behaviour, it was unacceptable and I will never do it again.',
    'I\'m sorry.',
    'I\'m really sorry.',
    'I hope you can forgive me for what I\'ve done.',
    'I will do my best to learn from this mistake that I\'ve made.',
    'On my Yeti honour and pride, I shall never do this again.'
];

export default class ApologiseCommand implements ICommand {
    public readonly name = 'apologise';
    public readonly aliases = ['apologize'];
    public readonly feature: Feature = null;

    public readonly helpGroup = HelpGroup.None;
    public readonly helpDescription = 'Makes Phil apologise for making a mistake.';

    public readonly versionAdded = 3;

    public readonly isAdminCommand = false;
    public async processMessage(phil: Phil, message: PublicMessage, commandArgs: ReadonlyArray<string>): Promise<any> {
        const apology = BotUtils.getRandomArrayEntry(apologies);
        return DiscordPromises.sendMessage(phil.bot, message.channelId, apology);
    }
};
