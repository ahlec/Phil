import CommandInvocation from '@phil/CommandInvocation';
import Role from '@phil/discord/Role';

import Features from '@phil/features/all-features';
import { AllPronouns, DEFAULT_PRONOUNS } from '@phil/pronouns/definitions';
import { Pronoun } from '@phil/pronouns/pronoun';
import {
  getPronounFromRole,
  getServerPronounRoles,
} from '@phil/pronouns/utils';
import ServerConfig from '@phil/server-config';
import { sanitizeMarkdown } from '@phil/utils';
import Command, { LoggerDefinition } from './@types';

const pronounUsageToPronouns: Record<string, Pronoun | undefined> = {};
for (const pronoun of AllPronouns) {
  pronounUsageToPronouns[pronoun.subject.toLowerCase()] = pronoun;
  pronounUsageToPronouns[pronoun.object.toLowerCase()] = pronoun;
  pronounUsageToPronouns[pronoun.possessive.toLowerCase()] = pronoun;
  pronounUsageToPronouns[pronoun.possessivePronoun.toLowerCase()] = pronoun;
  pronounUsageToPronouns[pronoun.reflexive.toLowerCase()] = pronoun;
}

function makeUsageInstructions(
  serverConfig: ServerConfig,
  prefix: readonly string[]
): string {
  const lines: string[] = [...prefix];

  if (prefix.length) {
    lines.push('');
  }

  lines.push(
    `You can change which pronoun Discord roles you have (as well as which pronouns I'll use when talking about you) by giving me a list of your pronouns.`,
    '',
    'I know the following pronouns:'
  );

  AllPronouns.forEach((pronoun): void => {
    lines.push(` • ${pronoun.displayName}`);
  });

  lines.push(
    '',
    `For example, \`${serverConfig.commandPrefix}pronoun they\` or \`${serverConfig.commandPrefix}pronoun she/hers\`.`,
    '',
    `You can also choose multiple pronouns, like \`${serverConfig.commandPrefix}pronoun he/they\` or \`${serverConfig.commandPrefix}pronoun she,them\`. If you have multiple pronouns, I'll alawys refer to you by ${DEFAULT_PRONOUNS.displayName}.`
  );

  return lines.join('\n');
}

function parseRequestedPronouns(
  args: readonly string[]
): {
  requested: ReadonlySet<Pronoun>;
  unrecognized: ReadonlySet<string>;
} {
  const requested = new Set<Pronoun>();
  const unrecognized = new Set<string>();

  // We want to handle both space-separated, comma-separated, and slash-separated
  // lists of pronouns. Might as well accept a mixture of all of them, just because
  // the implementation is basically the same anyways
  args.forEach((arg): void => {
    const pieces = arg.split(/(,|\/)/g);
    pieces.forEach((rawValue): void => {
      const value = sanitizeMarkdown(rawValue.trim().toLowerCase());
      if (!value || value === '/' || value === ',') {
        return;
      }

      const pronoun = pronounUsageToPronouns[value];
      if (pronoun) {
        requested.add(pronoun);
      } else {
        unrecognized.add(value);
      }
    });
  });

  return { requested, unrecognized };
}

type PronounRole = {
  role: Role;
  pronoun: Pronoun;
};

function filterPronounRoles(roles: readonly Role[]): readonly PronounRole[] {
  const results: PronounRole[] = [];
  roles.forEach((role): void => {
    const pronoun = getPronounFromRole(role);
    if (pronoun) {
      results.push({
        pronoun,
        role,
      });
    }
  });
  return results;
}

class PronounCommand extends Command {
  public constructor(parentDefinition: LoggerDefinition) {
    super('pronoun', parentDefinition, {
      aliases: ['pronouns'],
      feature: Features.Pronouns,
      helpDescription: 'Changes the pronouns that Phil uses to refer to you.',
      versionAdded: 13,
    });
  }

  public async invoke(invocation: CommandInvocation): Promise<void> {
    // Process user input, and determine which pronoun(s) the user asked for
    const { requested, unrecognized } = parseRequestedPronouns(
      invocation.commandArgs
    );
    this.write(
      `Requested: ${Array.from(requested)
        .map((pronoun) => pronoun.displayName)
        .join(', ')}`
    );
    this.write(
      `Unrecognized: ${Array.from(unrecognized)
        .map((value) => `'${value}'`)
        .join(', ')}`
    );

    // Handle error cases with user input
    if (!requested.size && !unrecognized.size) {
      // User didn't input any meaningful arguments at all
      await invocation.respond({
        color: 'powder-blue',
        description: makeUsageInstructions(invocation.context.serverConfig, []),
        fields: null,
        footer: '',
        title: 'Server Pronoun Roles',
        type: 'embed',
      });
      return;
    }

    if (unrecognized.size) {
      // One or more unrecognized inputs
      await invocation.respond({
        color: 'yellow',
        description: makeUsageInstructions(invocation.context.serverConfig, [
          `I didn't understand what you meant when you said: ${Array.from(
            unrecognized
          )
            .map(
              (value) => /* Input already sanitized in parsing */ `\`${value}\``
            )
            .join(', ')}.`,
        ]),
        fields: null,
        footer: '',
        title: 'Server Pronoun Roles',
        type: 'embed',
      });
      return;
    }

    // Remove any pronouns the user currently has that aren't in the list they
    // asked for
    const currentPronounRoles = filterPronounRoles(invocation.member.roles);
    const rolesToRemove = currentPronounRoles.filter(
      (role) => !requested.has(role.pronoun)
    );
    if (rolesToRemove.length) {
      try {
        await Promise.all(
          rolesToRemove.map(({ role }) => invocation.member.removeRole(role))
        );
      } catch (e) {
        this.error(`=============================`);
        this.error('Error removing old pronouns from a user');
        this.error('ERROR:');
        this.error(e);
        this.error('CONTEXT:');
        this.error(`  User: ${invocation.member.user.id}`);
        this.error(
          `  Pronouns: ${rolesToRemove
            .map(({ role }) => `${role.name} (${role.id})`)
            .join(', ')}`
        );
        this.error(`=============================`);
        await invocation.respond({
          error:
            'Something went wrong while I was trying to remove your previous pronouns. Could you let an admin know?',
          type: 'error',
        });
        return;
      }
    }

    // Determine while roles we should add to the user
    let serverPronounRoles: ReadonlyMap<Pronoun, Role>;
    try {
      serverPronounRoles = await getServerPronounRoles(
        invocation.context.server
      );
    } catch (e) {
      this.error(`=============================`);
      this.error('Error fetching server pronoun roles');
      this.error('ERROR:');
      this.error(e);
      this.error('CONTEXT:');
      this.error(`  Server: ${invocation.context.server.id}`);
      this.error(`=============================`);
      await invocation.respond({
        error:
          'Something went wrong while I was trying to get the list of server pronouns. Could you let an admin know?',
        type: 'error',
      });
      return;
    }

    let rolesToAdd: Role[];
    try {
      const rolePromises: Promise<Role>[] = [];
      requested.forEach((pronoun): void => {
        // If the user already has this pronoun, do nothing
        const hasRole = currentPronounRoles.some(
          (role): boolean => role.pronoun === pronoun
        );
        if (hasRole) {
          return;
        }

        // If the role exists already, reuse it
        const existingRole = serverPronounRoles.get(pronoun);
        if (existingRole) {
          rolePromises.push(Promise.resolve(existingRole));
          return;
        }

        rolePromises.push(
          invocation.context.server.createRole(pronoun.roleName)
        );
      });
      rolesToAdd = await Promise.all(rolePromises);
    } catch (e) {
      this.error(`=============================`);
      this.error('Error determining the roles to add');
      this.error('ERROR:');
      this.error(e);
      this.error('CONTEXT:');
      this.error(`  User: ${invocation.member.user.id}`);
      this.error(`  Server: ${invocation.context.server.id}`);
      this.error(
        `  Pronouns: ${rolesToRemove
          .map(({ role }) => `${role.name} (${role.id})`)
          .join(', ')}`
      );
      this.error(`=============================`);
      await invocation.respond({
        error:
          'Something went wrong while I was trying to retrieve your new Discord roles. Could you let an admin know?',
        type: 'error',
      });
      return;
    }

    if (rolesToAdd.length) {
      try {
        await Promise.all(
          rolesToAdd.map((role) => invocation.member.giveRole(role))
        );
      } catch (e) {
        this.error(`=============================`);
        this.error('Error adding new pronouns to a user');
        this.error('ERROR:');
        this.error(e);
        this.error('CONTEXT:');
        this.error(`  User: ${invocation.member.user.id}`);
        this.error(
          `  Roles: ${rolesToAdd
            .map((role) => `${role.name} (${role.id})`)
            .join(', ')}`
        );
        this.error(`=============================`);
        await invocation.respond({
          error:
            'Something went wrong while I was giving you your new pronoun roles. Could you let an admin know?',
          type: 'error',
        });
        return;
      }
    }

    // Successfully finished
    await invocation.respond({
      color: 'green',
      description:
        "I've updated your pronouns! If they change, feel free to update them using this command at any point in the future.",
      fields: null,
      footer: null,
      title: 'Server Pronoun Roles',
      type: 'embed',
    });
  }
}

export default PronounCommand;
