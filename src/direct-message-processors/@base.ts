import { Phil } from '../phil/phil';
import { DiscordMessage } from '../phil/discord-message';

export interface IProcessorActiveToken { // TODO: come up with a better name for this
    readonly isActive : boolean;
}

export interface DirectMessageProcessor {
    readonly handle : string;
    canProcess(phil : Phil, message : DiscordMessage) : Promise<IProcessorActiveToken>;
    process(phil : Phil, message : DiscordMessage, token : IProcessorActiveToken) : Promise<void>;
}
