import Member from '@phil/discord/Member';
import Role from '@phil/discord/Role';
import Server from '@phil/discord/Server';

import CommandInvocation from '@phil/CommandInvocation';
import Feature from '@phil/features/feature';
import { HelpGroup } from '@phil/help-groups';
import ServerConfig from '@phil/server-config';
import Command, { LoggerDefinition } from '@phil/commands/@types';

interface MemberUniqueRoleCommandBaseDetails {
  aliases?: ReadonlyArray<string>;
  feature?: Feature;
  helpDescription: string;
  versionAdded: number;
}

export interface RoleConfig {
  name: string;
  color?: number;
}

abstract class MemberUniqueRoleCommandBase<TData> extends Command {
  public constructor(
    name: string,
    parentDefinition: LoggerDefinition,
    details: MemberUniqueRoleCommandBaseDetails
  ) {
    super(name, parentDefinition, {
      aliases: details.aliases,
      feature: details.feature,
      helpDescription: details.helpDescription,
      helpGroup: HelpGroup.Roles,
      versionAdded: details.versionAdded,
    });
  }

  public async invoke(invocation: CommandInvocation): Promise<void> {
    const data = this.getDataFromCommandArgs(
      invocation.context.serverConfig,
      invocation.commandArgs
    );
    const role = await this.getRoleFromData(invocation.context.server, data);

    await this.removeAllRolesInPoolFromUser(invocation.member);
    await invocation.member.giveRole(role);

    await invocation.respond({
      text: this.getSuccessMessage(invocation.context.serverConfig, data),
      type: 'success',
    });
  }

  protected abstract getMissingCommandArgsErrorMessage(
    serverConfig: ServerConfig
  ): string;
  protected abstract getInvalidInputErrorMessage(
    input: string,
    serverConfig: ServerConfig
  ): string;
  protected abstract tryParseInput(input: string): TData | null;
  protected abstract isRolePartOfUniquePool(role: Role): boolean;
  protected abstract doesRoleMatchData(role: Role, data: TData): boolean;
  protected abstract getRoleConfig(data: TData): RoleConfig;
  protected abstract getSuccessMessage(
    serverConfig: ServerConfig,
    data: TData
  ): string;

  private getDataFromCommandArgs(
    serverConfig: ServerConfig,
    commandArgs: ReadonlyArray<string>
  ): TData {
    if (commandArgs.length === 0) {
      const errorMessage = this.getMissingCommandArgsErrorMessage(serverConfig);
      throw new Error(errorMessage);
    }

    const data = this.tryParseInput(commandArgs[0]);
    if (!data) {
      const errorMessage = this.getInvalidInputErrorMessage(
        commandArgs[0],
        serverConfig
      );
      throw new Error(errorMessage);
    }

    return data;
  }

  private async removeAllRolesInPoolFromUser(member: Member): Promise<void> {
    const rolesToRemove = member.roles.filter((role): boolean =>
      this.isRolePartOfUniquePool(role)
    );
    if (!rolesToRemove.length) {
      return;
    }

    await Promise.all(rolesToRemove.map((role) => member.removeRole(role)));
  }

  private async getRoleFromData(server: Server, data: TData): Promise<Role> {
    const allRoles = await server.getAllRoles();
    const existing = allRoles.find((role): boolean =>
      this.doesRoleMatchData(role, data)
    );
    if (existing) {
      return existing;
    }

    const roleOptions = this.getRoleConfig(data);
    return server.createRole(roleOptions.name, roleOptions);
  }
}

export default MemberUniqueRoleCommandBase;
