import Phil from 'phil';
import { DiscordPromises } from 'promises/discord';
import ServerConfig from 'server-config';
import IChrono from './@types';

export default class BootyDayChrono implements IChrono {
    public readonly handle = 'booty-day';

    public async process(phil: Phil, serverConfig: ServerConfig, now: Date) {
        if (now.getUTCDate() !== 3) {
            console.log('Today isn\'t booty day.');
            return;
        }

        DiscordPromises.sendMessage(phil.bot, serverConfig.newsChannel.id, process.env.CUSTOM_EMOJI_PEEK + ' It\'s booty day! Post your Hijack booties!');
    }
}
