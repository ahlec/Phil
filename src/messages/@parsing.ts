import MessageBase from 'messages/base';
import PrivateMessage from 'messages/private';
import PublicMessage from 'messages/public';
import { OfficialDiscordMessage, OfficialDiscordPayload } from 'official-discord';
import Phil from 'phil';

export async function parseMessage(phil: Phil, event: OfficialDiscordPayload<OfficialDiscordMessage>): Promise<MessageBase> {
    const isDirectMessage = (event.d.channel_id in phil.bot.directMessages);
    if (isDirectMessage) {
        return new PrivateMessage(event, phil);
    }

    const server = phil.getServerFromChannelId(event.d.channel_id);
    const serverConfig = await phil.serverDirectory.getServerConfig(server);
    return new PublicMessage(event, phil, serverConfig);
}
