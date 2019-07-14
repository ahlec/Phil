import Logger from '../Logger';
import LoggerDefinition from '../LoggerDefinition';
import PrivateMessage from '../messages/private';
import Phil from '../phil';

export abstract class BotManagerCommand extends Logger {
  public constructor(
    public readonly name: string,
    parentDefinition: LoggerDefinition
  ) {
    super(new LoggerDefinition(name, parentDefinition));
  }

  public abstract execute(phil: Phil, message: PrivateMessage): Promise<void>;
}

export { LoggerDefinition, Phil, PrivateMessage };
