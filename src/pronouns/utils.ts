import { Role as DiscordIORole } from 'discord.io';
import { AllPronouns } from 'pronouns/definitions';
import Pronoun from 'pronouns/pronoun';

// -------------------------- Looking up pronouns
const roleToPronounLookup: { [displayName: string]: Pronoun } = {};

for (const pronoun of AllPronouns) {
    roleToPronounLookup[pronoun.roleName] = pronoun;
}

export function getPronounFromRole(role: DiscordIORole): Pronoun | null {
    const pronoun = roleToPronounLookup[role.name];
    if (pronoun) {
        return pronoun;
    }

    return null;
}
