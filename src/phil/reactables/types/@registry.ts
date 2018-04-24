import { ReactableType } from './@reactable-type';
import { PromptQueueReactable } from './prompt-queue';

interface IReactableTypeRegistry {
    [reactableTypeName : string] : ReactableType;
}

export const ReactableTypeRegistry : IReactableTypeRegistry = {};

function register(reactable : ReactableType) {
    ReactableTypeRegistry[reactable.handle] = reactable;
}

register(new PromptQueueReactable());
