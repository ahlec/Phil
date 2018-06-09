import { Phil } from '../phil';
import { ReactablePost } from './post';
import { OfficialDiscordReactionEvent, OfficialDiscordEmoji } from 'official-discord';

export abstract class ReactableType  {
    abstract readonly handle : string;

    abstract processReactionAdded(phil : Phil, post : ReactablePost, event : OfficialDiscordReactionEvent) : Promise<any>;
};
