import Database from '@phil/database';
import ReactableFactoryBase, {
  ReactableCreationArgs,
} from '@phil/reactables/factory-base';
import { ReactableType } from '@phil/reactables/types';

import { Data, Emoji } from './shared';

class SuggestSessionReactableFactory extends ReactableFactoryBase<
  ReactableType.SuggestSession
> {
  public constructor(
    database: Database,
    args: ReactableCreationArgs,
    data: Data,
    private readonly canMakeAnonymous: boolean
  ) {
    super(ReactableType.SuggestSession, database, args, data);
  }

  protected getEmojiReactions(): readonly string[] {
    const reactions = [Emoji.Stop];

    if (this.canMakeAnonymous) {
      reactions.push(Emoji.MakeAnonymous);
    }

    return reactions;
  }
}

export default SuggestSessionReactableFactory;
