module.exports = (function() {
    'use strict';

	return {
        name: 'new daily prompt',
        hourUtc: 12, // 8am EST, 5am PST
        canProcess: function(chronosManager, now, bot, db) {
	        return true;
        },
        process: function(chronosManager, now, bot, db) {
		}
	};
})();