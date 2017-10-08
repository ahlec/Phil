'use strict';

module.exports = (function() {
	const versions = {
	    CODE:     7,
	    DATABASE: 3
    };

	Object.freeze(versions);

    return versions;
})();