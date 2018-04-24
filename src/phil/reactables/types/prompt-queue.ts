import { ReactableType } from './@reactable-type';
import { Client as DiscordIOClient } from 'discord.io';
import { Database } from '../../database';
import { ReactablePost } from '../post';
import { OfficialDiscordReactionEvent } from 'official-discord';

export class Data {
    currentPage : number;
    totalNumberPages : number;
    pageSize : number;
    bucket : number;
}

export class PromptQueueReactable extends ReactableType {
    public static readonly PREVIOUS_EMOJI = '◀';
    public static readonly NEXT_EMOJI = '▶';

    readonly handle = 'prompt-queue';

    async processReactionAdded(bot : DiscordIOClient, db : Database, post : ReactablePost, event : OfficialDiscordReactionEvent) : Promise<any> {
        switch (event.emoji.name) {
            case PromptQueueReactable.PREVIOUS_EMOJI: {
                await this.movePage(bot, db, post, -1);
                break;
            }
            case PromptQueueReactable.NEXT_EMOJI: {
                await this.movePage(bot, db, post, 1);
                break;
            }
        }

        await this.resetEmoji(bot, post, event.emoji);
    }

    private async movePage(bot : DiscordIOClient, db : Database, post : ReactablePost, pageDelta : number) : Promise<void> {
        const data = post.jsonData as Data;
        const newPageNumber = data.currentPage + pageDelta;

        if (!this.canMoveToPage(data, newPageNumber)) {
            return;
        }

        console.log('navigate to page ' + newPageNumber + ' / ' + data.totalNumberPages);
    }

    private canMoveToPage(data : Data, newPageNumber : number) : boolean {
        return (newPageNumber > 0 && newPageNumber <= data.totalNumberPages);
    }
}
