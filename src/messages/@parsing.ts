import {
  OfficialDiscordMessage,
  OfficialDiscordPayload,
} from 'official-discord';
import Phil from '@phil/phil';
import MessageBase from './base';
import PrivateMessage from './private';
import PublicMessage from './public';

export async function parseMessage(
  phil: Phil,
  event: OfficialDiscordPayload<OfficialDiscordMessage>
): Promise<MessageBase> {
  const isDirectMessage = event.d.channel_id in phil.bot.directMessages;
  if (isDirectMessage) {
    return new PrivateMessage(event, phil);
  }

  const server = phil.getServerFromChannelId(event.d.channel_id);
  if (!server) {
    throw new Error(
      `Received a message in channel ${event.d.channel_id}, which is not a server I'm in.`
    );
  }

  const serverConfig = await phil.serverDirectory.getServerConfig(server);
  if (!serverConfig) {
    throw new Error(
      `A member of server ${server.id} but do not have server config for it.`
    );
  }

  return new PublicMessage(event, phil, serverConfig);
}
