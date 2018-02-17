'use strict';

const ADMIN_GROUP = 999;
const groupHeaders = [
    ':trident: GENERAL',
    ':joy: MEMES',
    ':military_medal: ROLES',
    ':writing_hand: PROMPTS',
    ':clock4: TIME'
];

module.exports = {
    Groups: {
        None: -1,
        General: 0,
        Memes: 1,
        Roles: 2,
        Prompts: 3,
        Time: 4,
        Admin: ADMIN_GROUP
    },

    getHeaderForGroup: function(groupNumber) {
        if (groupNumber === ADMIN_GROUP) {
            return ':star2: ADMIN';
        }

        return groupHeaders[groupNumber];
    }
};
