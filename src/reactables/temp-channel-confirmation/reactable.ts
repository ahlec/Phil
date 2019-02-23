import { OfficialDiscordReactionEvent } from 'official-discord';
import Bucket from '../../buckets';
import EmbedColor from '../../embed-color';
import Phil from '../../phil';
import { DiscordPromises } from '../../promises/discord';
import { PromptQueue } from '../../prompts/queue';
import ReactablePost from '../../reactables/post';
import ReactableType from '../../reactables/reactable-type';
import { Emoji, JsonData, ReactableHandle } from './shared';

export default class TempChannelConfirmationReactable extends ReactableType {
  public readonly handle = ReactableHandle;

  public async processReactionAdded(
    phil: Phil,
    post: ReactablePost,
    event: OfficialDiscordReactionEvent
  ): Promise<any> {
    switch (event.emoji.name) {
      case Emoji.Confirm: {
        await this.movePage(phil, post, -1);
        break;
      }

      case Emoji.Reject: {
        await post.remove(phil.db);
        const channel = phil.bot.channels[post.channelId];
        const server = phil.bot.servers[channel.guild_id];
        const serverConfig = await phil.serverDirectory.getServerConfig(server);
        if (!serverConfig) {
          return;
        }

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

  private async movePage(
    phil: Phil,
    post: ReactablePost,
    pageDelta: number
  ): Promise<void> {
    const data = post.jsonData as PromptQueueReactableShared.Data;
    const newPageNumber = data.currentPage + pageDelta;

    if (!this.canMoveToPage(data, newPageNumber)) {
      console.log('cannot move to page ' + newPageNumber);
      return;
    }

    const bucket = await Bucket.getFromId(phil.bot, phil.db, data.bucket);
    if (!bucket) {
      throw new Error(
        'The bucket that this queue is for (`' +
          data.bucket +
          '`) has been deleted.'
      );
    }

    const queue = await PromptQueue.getPromptQueue(
      phil.bot,
      phil.db,
      bucket,
      newPageNumber,
      data.pageSize
    );

    await post.remove(phil.db);
    await DiscordPromises.deleteMessage(
      phil.bot,
      post.channelId,
      post.messageId
    );

    await queue.postToChannel(phil.bot, phil.db, post);

    console.log('moving to page ' + newPageNumber);
  }

  private canMoveToPage(
    data: PromptQueueReactableShared.Data,
    newPageNumber: number
  ): boolean {
    return newPageNumber > 0 && newPageNumber <= data.totalNumberPages;
  }
}
