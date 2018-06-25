export class Pronoun {
    public readonly roleName: string;
    public readonly displayName: string;

    constructor(readonly subject: string,
        readonly object: string,
        readonly possessive: string,
        readonly possessivePronoun: string,
        readonly reflexive: string
    ) {
        this.displayName = this.subject + ' / ' + this.object + ' / ' +
            this.possessive;
        this.roleName = 'pronouns: ' + this.displayName;
    }
}

export default Pronoun;
