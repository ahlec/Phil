import { Phil } from '../phil/phil';
import { DiscordMessage } from '../phil/discord-message';

export interface Analyzer {
    readonly handle : string;
    process(phil : Phil, message : DiscordMessage) : Promise<void>;
}

export interface IAnalyzerLookup {
    [analyzerName : string] : Analyzer;
}
