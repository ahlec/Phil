import Features from '../features/all-features';
import { HelpGroup } from '../help-groups';
import PublicMessage from '../messages/public';
import PermissionLevel from '../permission-level';
import Phil from '../phil';
import Requestable, { RequestableCreationDefinition } from '../requestables';
import ServerConfig from '../server-config';
import { sendSuccessMessage } from '@phil/utils';
import Command, { LoggerDefinition } from './@types';

export default class DefineCommand extends Command {
  public constructor(parentDefinition: LoggerDefinition) {
    super('define', parentDefinition, {
      feature: Features.Requestables,
      helpDescription:
        'Creates a new requestable role that users can use with the request command.',
      helpGroup: HelpGroup.Roles,
      permissionLevel: PermissionLevel.AdminOnly,
      versionAdded: 1,
    });
  }

  public async processMessage(
    phil: Phil,
    message: PublicMessage,
    commandArgs: ReadonlyArray<string>
  ): Promise<void> {
    const definition = this.getDefinitionData(
      commandArgs,
      message.serverConfig
    );
    if (!Requestable.checkIsValidRequestableName(definition.name)) {
      throw new Error(
        "The name you provided isn't valid to use as a requestable. It must be at least two characters in length and made up only of alphanumeric characters and dashes."
      );
    }

    const existing = await Requestable.getFromRequestString(
      phil.db,
      message.server,
      definition.name
    );
    if (existing) {
      throw new Error(
        'There is already a `' + definition.name + '` request string.'
      );
    }

    await Requestable.createRequestable(phil.db, message.server, definition);
    const reply =
      '`' +
      definition.name +
      '` has been set up for use with `' +
      message.serverConfig.commandPrefix +
      'request` to grant the ' +
      definition.role.name +
      ' role.';
    await sendSuccessMessage({
      bot: phil.bot,
      channelId: message.channelId,
      message: reply,
    });
  }

  private getDefinitionData(
    commandArgs: ReadonlyArray<string>,
    serverConfig: ServerConfig
  ): RequestableCreationDefinition {
    if (commandArgs.length < 2) {
      throw new Error(
        '`' +
          serverConfig.commandPrefix +
          'define` requires two parameters, separated by a space:\n' +
          '[1] the text to be used by users with `' +
          serverConfig.commandPrefix +
          'request` (cannot contain any spaces)\n' +
          '[2] the full name of the Discord role (as it currently is spelled)'
      );
    }

    const requestString = commandArgs[0].toLowerCase().replace(/`/g, '');
    if (requestString.length === 0) {
      throw new Error(
        'The request string that you entered is invalid or contained only invalid characters.'
      );
    }

    const roleName = commandArgs
      .slice(1)
      .join(' ')
      .trim()
      .toLowerCase();
    for (const roleId in serverConfig.server.roles) {
      const role = serverConfig.server.roles[roleId];
      if (role.name.toLowerCase() === roleName) {
        return {
          name: requestString,
          role,
        };
      }
    }

    throw new Error('There is no role with the name of `' + roleName + '`.');
  }
}
