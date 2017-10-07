'use strict';

module.exports = (function() {
	const versions = {
	    CODE:     6,
	    DATABASE: 3
    };

	Object.freeze(versions);

    return versions;
})();