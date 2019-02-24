import {
  Client as DiscordIOClient,
  Server as DiscordIOServer,
} from 'discord.io';
import { OfficialDiscordReactionEvent } from 'official-discord';
import { ChannelType } from '../../DiscordConstants';
import EmbedColor from '../../embed-color';
import Phil from '../../phil';
import { createChannel, DiscordPromises } from '../../promises/discord';
import ReactablePost from '../../reactables/post';
import ReactableType from '../../reactables/reactable-type';
import TemporaryChannel, { CATEGORY_NAME } from '../../TemporaryChannel';
import { Emoji, JsonData, ReactableHandle } from './shared';

export default class TempChannelConfirmationReactable extends ReactableType {
  public readonly handle = ReactableHandle;

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
        const categoryId = await this.getTempChannelCategoryId(
          phil.bot,
          server
        );
        const newChannel = await createChannel(
          phil.bot,
          server.id,
          'text',
          tempChannelName,
          categoryId
        );
        await TemporaryChannel.create(
          phil.db,
          newChannel,
          server,
          post.user.id,
          topic
        );
        break;
      }

      case Emoji.Reject: {
        await post.remove(phil.db);
        return DiscordPromises.sendEmbedMessage(phil.bot, post.channelId, {
          color: EmbedColor.Info,
          description: `Okay! I won't make this channel. If you want to try again, feel free to use \`${
            serverConfig.commandPrefix
          }tempchannel\`.`,
          title: `Channel Not Created`,
        });
      }
    }
  }

  private async getTempChannelCategoryId(
    client: DiscordIOClient,
    server: DiscordIOServer
  ): Promise<string> {
    const channels = Object.values(server.channels);
    const category = channels.find(
      channel =>
        channel.type === ChannelType.Category && channel.name === CATEGORY_NAME
    );
    if (category) {
      return category.id;
    }

    const newCategory = await createChannel(
      client,
      server.id,
      'category',
      CATEGORY_NAME
    );
    return newCategory.id;
  }
}
