import { Role as DiscordIORole } from 'discord.io';

export class Pronoun {
    readonly roleDisplayName : string;

    constructor(readonly subject : string,
        readonly object : string,
        readonly possessive : string,
        readonly possessivePronoun : string,
        readonly reflexive : string
        ) {
        this.roleDisplayName = 'pronoun: ' + this.subject + ' / ' +
            this.object + ' / ' + this.possessive;
    }
}

const TheyPronouns = new Pronoun('they', 'them', 'their', 'theirs', 'themself');

const pronouns = [
    new Pronoun('he', 'him', 'his', 'his', 'himself'),
    new Pronoun('she', 'her', 'her', 'hers', 'herself'),
    TheyPronouns
];

export const DEFAULT_PRONOUNS = TheyPronouns;
export const GROUP_PRONOUNS = TheyPronouns;

// -------------------------- Looking up pronouns
const pronounLookup : { [displayName : string] : Pronoun } = {};
for (let pronoun of pronouns) {
    pronounLookup[pronoun.roleDisplayName] = pronoun;
}

export function getPronounFromRole(role : DiscordIORole) : Pronoun | null {
    const pronoun = pronounLookup[role.name];
    if (pronoun) {
        return pronoun;
    }

    return null;
}
