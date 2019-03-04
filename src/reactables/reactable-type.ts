import { OfficialDiscordReactionEvent } from 'official-discord';
import Logger from '../Logger';
import LoggerDefinition from '../LoggerDefinition';
import Phil from '../phil';
import ReactablePost from './post';

export default abstract class ReactableType extends Logger {
  protected constructor(
    public readonly handle: string,
    parentDefinition: LoggerDefinition
  ) {
    super(new LoggerDefinition(handle, parentDefinition));
  }

  public abstract processReactionAdded(
    phil: Phil,
    post: ReactablePost,
    event: OfficialDiscordReactionEvent
  ): Promise<any>;
}

export { default as LoggerDefinition } from '../LoggerDefinition';
