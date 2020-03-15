import ReactableType from './reactable-type';

import PromptQueueReactable from './prompt-queue/reactable';
import SuggestSessionReactable from './suggest-session/reactable';

interface ReactableTypeRegistry {
  [reactableTypeName: string]: ReactableType;
}

export const ReactableTypeRegistry: ReactableTypeRegistry = {};

function register(reactable: ReactableType): void {
  ReactableTypeRegistry[reactable.handle] = reactable;
}

register(new PromptQueueReactable());
register(new SuggestSessionReactable());
