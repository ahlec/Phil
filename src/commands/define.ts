import CommandInvocation from '@phil/CommandInvocation';
import Features from '@phil/features/all-features';
import { HelpGroup } from '@phil/help-groups';
import PermissionLevel from '@phil/permission-level';
import Requestable, { RequestableCreationDefinition } from '@phil/requestables';
import Command, { LoggerDefinition } from './@types';

class DefineCommand extends Command {
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

  public async invoke(invocation: CommandInvocation): Promise<void> {
    const definition = await this.getDefinitionData(invocation);
    if (!Requestable.checkIsValidRequestableName(definition.name)) {
      throw new Error(
        "The name you provided isn't valid to use as a requestable. It must be at least two characters in length and made up only of alphanumeric characters and dashes."
      );
    }

    const existing = await invocation.context.requestables.retrieve({
      requestString: definition.name,
      type: 'request-string',
    });
    if (existing) {
      throw new Error(
        'There is already a `' + definition.name + '` request string.'
      );
    }

    await invocation.context.requestables.create(
      definition.name,
      definition.role
    );
    const reply =
      '`' +
      definition.name +
      '` has been set up for use with `' +
      invocation.context.serverConfig.commandPrefix +
      'request` to grant the ' +
      definition.role.name +
      ' role.';
    await invocation.respond({
      text: reply,
      type: 'success',
    });
  }

  private async getDefinitionData(
    invocation: CommandInvocation
  ): Promise<RequestableCreationDefinition> {
    if (invocation.commandArgs.length < 2) {
      throw new Error(
        '`' +
          invocation.context.serverConfig.commandPrefix +
          'define` requires two parameters, separated by a space:\n' +
          '[1] the text to be used by users with `' +
          invocation.context.serverConfig.commandPrefix +
          'request` (cannot contain any spaces)\n' +
          '[2] the full name of the Discord role (as it currently is spelled)'
      );
    }

    const requestString = invocation.commandArgs[0]
      .toLowerCase()
      .replace(/`/g, '');
    if (requestString.length === 0) {
      throw new Error(
        'The request string that you entered is invalid or contained only invalid characters.'
      );
    }

    const roleName = invocation.commandArgs
      .slice(1)
      .join(' ')
      .trim()
      .toLowerCase();
    const allRoles = await invocation.context.server.getAllRoles();
    const role = allRoles.find(
      (r): boolean => r.name.toLowerCase() === roleName
    );
    if (role) {
      return {
        name: requestString,
        role,
      };
    }

    throw new Error('There is no role with the name of `' + roleName + '`.');
  }
}

export default DefineCommand;
