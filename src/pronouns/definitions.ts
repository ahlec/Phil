import Pronoun from './pronoun';

const TheyPronouns = new Pronoun('they', 'them', 'their', 'theirs', 'themself');

export const AllPronouns: ReadonlyArray<Pronoun> = [
    new Pronoun('he', 'him', 'his', 'his', 'himself'),
    new Pronoun('she', 'her', 'her', 'hers', 'herself'),
    TheyPronouns
];

export const DEFAULT_PRONOUNS: Pronoun = TheyPronouns;
export const GROUP_PRONOUNS: Pronoun = TheyPronouns;
