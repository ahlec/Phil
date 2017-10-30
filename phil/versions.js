'use strict';

module.exports = (function() {
    const versions = {
        CODE:     8,
        DATABASE: 4
    };

    Object.freeze(versions);

    return versions;
})();