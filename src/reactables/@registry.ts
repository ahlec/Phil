import ReactableType from './reactable-type';

import PromptQueueReactable from './prompt-queue/reactable';
import SuggestSessionReactable from './suggest-session/reactable';
import TempChannelConfirmationReactable from './temp-channel-confirmation/reactable';

interface ReactableTypeRegistry {
  [reactableTypeName: string]: ReactableType;
}

export const ReactableTypeRegistry: ReactableTypeRegistry = {};

function register(reactable: ReactableType) {
  ReactableTypeRegistry[reactable.handle] = reactable;
}

register(new PromptQueueReactable());
register(new SuggestSessionReactable());
register(new TempChannelConfirmationReactable());
