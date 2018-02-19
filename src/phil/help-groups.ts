'use strict';

const groupHeaders = [
    ':trident: GENERAL',
    ':joy: MEMES',
    ':military_medal: ROLES',
    ':writing_hand: PROMPTS',
    ':clock4: TIME'
];

export enum HelpGroup {
    None = -1,
    General = 0,
    Memes = 1,
    Roles = 2,
    Prompts = 3,
    Time = 4,
    Admin = 999
}

export function getHeaderForGroup(groupNumber : HelpGroup) : string {
    if (groupNumber === HelpGroup.Admin) {
        return ':star2: ADMIN';
    }

    return groupHeaders[groupNumber];
}
