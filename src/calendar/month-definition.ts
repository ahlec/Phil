export class MonthDefinition {
    constructor(public readonly fullName: string,
        public readonly abbreviation: string,
        public readonly emoji: string) {
    }
}

export const AllMonths = [
    new MonthDefinition('January', 'Jan', ':snowman2:'),
    new MonthDefinition('February', 'Feb', ':revolving_hearts:'),
    new MonthDefinition('March', 'Mar', ':four_leaf_clover:'),
    new MonthDefinition('April', 'Apr', ':cloud_rain:'),
    new MonthDefinition('May', 'May', ':rose:'),
    new MonthDefinition('June', 'June', ':beach:'),
    new MonthDefinition('July', 'July', ':sunrise:'),
    new MonthDefinition('August', 'Aug', ':sun_with_face:'),
    new MonthDefinition('September', 'Sept', ':fallen_leaf:'),
    new MonthDefinition('October', 'Oct', ':jack_o_lantern:'),
    new MonthDefinition('November', 'Nov', ':turkey:'),
    new MonthDefinition('December', 'Dec', ':snowflake:')
];
