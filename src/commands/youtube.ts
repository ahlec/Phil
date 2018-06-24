import { IPublicMessage } from 'phil';
import Feature from '../phil/features/feature';
import { HelpGroup } from '../phil/help-groups';
import Phil from '../phil/phil';
import { DiscordPromises } from '../promises/discord';
import YouTubePromises from '../promises/youtube';
import ICommand from './@types';

export default class YoutubeCommand implements ICommand {
    public readonly name = 'youtube';
    public readonly aliases = [ 'yt' ];
    public readonly feature: Feature = null;

    public readonly helpGroup = HelpGroup.General;
    public readonly helpDescription = 'Searches YouTube for something and posts a link to the first video.';

    public readonly versionAdded = 4;

    public readonly isAdminCommand = false;
    public async processMessage(phil: Phil, message: IPublicMessage, commandArgs: ReadonlyArray<string>): Promise<any> {
        const query = commandArgs.join(' ').trim();
        if (query.length === 0) {
            throw new Error('You must provide some text to tell me what to search for.');
        }

        const results = await YouTubePromises.search(phil.globalConfig, query);
        if (results.length === 0 || !results[0].id) {
            throw new Error('There were no results on YouTube for you search.');
        }

        const link = 'https://youtu.be/' + results[0].id;
        DiscordPromises.sendMessage(phil.bot, message.channelId, link);
    }
};
