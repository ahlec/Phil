import { OfficialDiscordMessage, OfficialDiscordPayload } from 'official-discord';
import Phil from '../phil';
import MessageBase from './base';
import PrivateMessage from './private';
import PublicMessage from './public';

export async function parseMessage(phil: Phil, event: OfficialDiscordPayload<OfficialDiscordMessage>): Promise<MessageBase> {
    const isDirectMessage = (event.d.channel_id in phil.bot.directMessages);
    if (isDirectMessage) {
        return new PrivateMessage(event, phil);
    }

    const server = phil.getServerFromChannelId(event.d.channel_id);
    const serverConfig = await phil.serverDirectory.getServerConfig(server);
    return new PublicMessage(event, phil, serverConfig);
}
