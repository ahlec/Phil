import { Role as DiscordIORole } from 'discord.io';

export class Pronoun {
    readonly roleName : string;
    readonly displayName : string;

    constructor(readonly subject : string,
        readonly object : string,
        readonly possessive : string,
        readonly possessivePronoun : string,
        readonly reflexive : string
    ) {
        this.displayName = this.subject + ' / ' + this.object + ' / ' +
            this.possessive;
        this.roleName = 'pronouns: ' + this.displayName;
    }
}

const TheyPronouns = new Pronoun('they', 'them', 'their', 'theirs', 'themself');

export const AllPronouns : ReadonlyArray<Pronoun> = [
    new Pronoun('he', 'him', 'his', 'his', 'himself'),
    new Pronoun('she', 'her', 'her', 'hers', 'herself'),
    TheyPronouns
];

export const DEFAULT_PRONOUNS = TheyPronouns;
export const GROUP_PRONOUNS = TheyPronouns;

// -------------------------- Looking up pronouns
const roleToPronounLookup : { [displayName : string] : Pronoun } = {};

for (let pronoun of AllPronouns) {
    roleToPronounLookup[pronoun.roleName] = pronoun;
}

export function getPronounFromRole(role : DiscordIORole) : Pronoun | null {
    const pronoun = roleToPronounLookup[role.name];
    if (pronoun) {
        return pronoun;
    }

    return null;
}
