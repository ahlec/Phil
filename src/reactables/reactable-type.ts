import { OfficialDiscordReactionEvent } from 'official-discord';
import Phil from '../phil';
import ReactablePost from './post';

export default abstract class ReactableType  {
    public abstract readonly handle : string;

    public abstract processReactionAdded(phil: Phil, post: ReactablePost,
        event: OfficialDiscordReactionEvent): Promise<any>;
};
