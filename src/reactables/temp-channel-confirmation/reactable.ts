import { OfficialDiscordReactionEvent } from 'official-discord';
import Phil from '../../phil';
import { sendEmbedMessage } from '../../promises/discord';
import ReactablePost from '../../reactables/post';
import ReactableType, {
  LoggerDefinition,
} from '../../reactables/reactable-type';
import TemporaryChannel from '../../TemporaryChannel';
import { Emoji, JsonData, ReactableHandle } from './shared';

export default class TempChannelConfirmationReactable extends ReactableType {
  public constructor(parentDefinition: LoggerDefinition) {
    super(ReactableHandle, parentDefinition);
  }

  public async processReactionAdded(
    phil: Phil,
    post: ReactablePost,
    event: OfficialDiscordReactionEvent
  ): Promise<any> {
    const channel = phil.bot.channels[post.channelId];
    const server = phil.bot.servers[channel.guild_id];
    const serverConfig = (await phil.serverDirectory.getServerConfig(server))!;

    switch (event.emoji.name) {
      case Emoji.Confirm: {
        await post.remove(phil.db);
        const { tempChannelName, topic } = post.jsonData as JsonData;
        try {
          const tempChannel = await TemporaryChannel.create(
            phil.bot,
            phil.db,
            serverConfig,
            post.user.id,
            tempChannelName,
            topic
          );
          return sendEmbedMessage(phil.bot, post.channelId, {
            color: 'info',
            description: `Okay! I went ahead and created <#${
              tempChannel.channel.id
            }>. Please enjoy your channel responsibly!`,
            title: 'Channel Created',
          });
        } catch (err) {
          return sendEmbedMessage(phil.bot, post.channelId, {
            color: 'error',
            description: `An error occurred when trying to create your channel: ${
              err.message
            }`,
            title: 'An error occurred',
          });
        }
      }

      case Emoji.Reject: {
        await post.remove(phil.db);
        return sendEmbedMessage(phil.bot, post.channelId, {
          color: 'info',
          description: `Okay! I won't make this channel. If you want to try again, feel free to use \`${
            serverConfig.commandPrefix
          }tempchannel\`.`,
          title: `Channel Not Created`,
        });
      }
    }
  }
}
