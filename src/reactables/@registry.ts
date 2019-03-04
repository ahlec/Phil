import ReactableType, { LoggerDefinition } from './reactable-type';

import PromptQueueReactable from './prompt-queue/reactable';
import SuggestSessionReactable from './suggest-session/reactable';
import TempChannelConfirmationReactable from './temp-channel-confirmation/reactable';

export interface ReactableTypeRegistry {
  [reactableTypeName: string]: ReactableType;
}

const REACTABLES: ReadonlyArray<
  new (parentDefinition: LoggerDefinition) => ReactableType
> = [
  PromptQueueReactable,
  SuggestSessionReactable,
  TempChannelConfirmationReactable,
];

export function instantiateRegistry(
  parentDefinition: LoggerDefinition
): ReactableTypeRegistry {
  const registry: ReactableTypeRegistry = {};
  for (const constructor of REACTABLES) {
    const reactable = new constructor(parentDefinition);
    registry[reactable.handle] = reactable;
  }

  return registry;
}
