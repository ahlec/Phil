import Role from '@phil/discord/Role';
import Server from '@phil/discord/Server';

import { AllPronouns } from './definitions';
import Pronoun from './pronoun';

// -------------------------- Looking up pronouns
const roleToPronounLookup: { [displayName: string]: Pronoun } = {};

for (const pronoun of AllPronouns) {
  roleToPronounLookup[pronoun.roleName] = pronoun;
}

export function getPronounFromRole(role: Role): Pronoun | null {
  const pronoun = roleToPronounLookup[role.name];
  if (pronoun) {
    return pronoun;
  }

  return null;
}

export async function getServerPronounRoles(
  server: Server
): Promise<ReadonlyMap<Pronoun, Role>> {
  const result = new Map<Pronoun, Role>();
  const allRoles = await server.getAllRoles();
  allRoles.forEach((role): void => {
    const pronoun = getPronounFromRole(role);
    if (!pronoun) {
      return;
    }

    result.set(pronoun, role);
  });
  return result;
}
