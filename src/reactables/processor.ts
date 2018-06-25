import { OfficialDiscordReactionEvent } from 'official-discord';
import Phil from '../phil';
import { ReactableTypeRegistry } from './@registry';
import ReactablePost from './post';

export default class ReactableProcessor {
    constructor(private readonly phil: Phil) {
    }

    public async processReactionAdded(event: OfficialDiscordReactionEvent): Promise<void> {
        if (!this.shouldProcessEvent(event)) {
            return;
        }

        const post = await ReactablePost.getFromMessageId(this.phil.bot, this.phil.db, event.message_id);
        if (!post) {
            return;
        }

        if (!post.monitoredReactions.has(event.emoji.name)) {
            return;
        }

        const reactableType = ReactableTypeRegistry[post.reactableHandle];
        if (!reactableType) {
            throw new Error('Attempted to react to an undefined reactable: `' + post.reactableHandle + '`');
        }

        reactableType.processReactionAdded(this.phil, post, event);
    }

    private shouldProcessEvent(event : OfficialDiscordReactionEvent) : boolean {
        const user = this.phil.bot.users[event.user_id];
        if (!user) {
            return false;
        }

        return !user.bot;
    }
};
