import { OfficialDiscordReactionEvent } from 'official-discord';

import Phil from '@phil/phil';

import { Data as PromptQueueData } from './prompt-queue/shared';
import { Data as SuggestSessionData } from './suggest-session/shared';
import ReactablePost from './post';

export enum ReactableType {
  PromptQueue = 'prompt-queue',
  SuggestSession = 'suggest-session-post',
}

export interface ReactableTypeData {
  [ReactableType.PromptQueue]: PromptQueueData;
  [ReactableType.SuggestSession]: SuggestSessionData;
}

export interface ReactableHandler<TType extends ReactableType> {
  processReactionAdded(
    phil: Phil,
    post: ReactablePost<TType>,
    event: OfficialDiscordReactionEvent
  ): Promise<void>;
}
