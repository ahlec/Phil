import { OfficialDiscordReactionEvent } from 'official-discord';
import Logger from '../Logger';
import LoggerDefinition from '../LoggerDefinition';
import Phil from '../phil';
import { instantiateRegistry, ReactableTypeRegistry } from './@registry';
import ReactablePost from './post';

const definition = new LoggerDefinition('ReactableProcessor');

export default class ReactableProcessor extends Logger {
  private registry: ReactableTypeRegistry;

  constructor(private readonly phil: Phil) {
    super(definition);
    this.registry = instantiateRegistry(definition);

    this.write('Starting processor.');
    for (const handle of Object.keys(this.registry)) {
      this.write(` > Registered '${handle}'.`);
    }
  }

  public async processReactionAdded(
    event: OfficialDiscordReactionEvent
  ): Promise<void> {
    if (!this.shouldProcessEvent(event)) {
      return;
    }

    const post = await ReactablePost.getFromMessageId(
      this.phil.bot,
      this.phil.db,
      event.message_id
    );
    if (!post) {
      return;
    }

    if (!post.monitoredReactions.has(event.emoji.name)) {
      return;
    }

    const reactableType = this.registry[post.reactableHandle];
    if (!reactableType) {
      this.error(
        'Attempted to react to an undefined reactable: `' +
          post.reactableHandle +
          '`'
      );

      return;
    }

    try {
      reactableType.processReactionAdded(this.phil, post, event);
    } catch (err) {
      this.error(err);
    }
  }

  private shouldProcessEvent(event: OfficialDiscordReactionEvent): boolean {
    const user = this.phil.bot.users[event.user_id];
    if (!user) {
      return false;
    }

    return !user.bot;
  }
}
