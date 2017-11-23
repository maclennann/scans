var async = require('async');
var helpers = require('../../helpers');

module.exports = {
	title: 'IAM User Admins',
	category: 'IAM',
	description: 'Ensures a minimum number of IAM admins are present in the account',
	more_info: 'To reduce management complexity, IAM permissions should only be assigned to roles and groups. Users can then be added to those groups. Policies should not be applied directly to a user.',
	link: 'http://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html#use-groups-for-permissions',
	recommended_action: 'Create groups with the required policies, move the IAM users to the applicable groups, and then remove the inline and directly attached policies from the IAM user.',
	apis: ['IAM:listUsers', 'IAM:listUserPolicies', 'IAM:listAttachedUserPolicies'],

	run: function(cache, settings, callback) {
		var results = [];
		var source = {};
		
		var region = 'us-east-1';

		var listUsers = helpers.addSource(cache, source,
				['iam', 'listUsers', region]);

		if (!listUsers) return callback(null, results, source);

		if (listUsers.err || !listUsers.data) {
			helpers.addResult(results, 3,
				'Unable to query for user IAM policy status: ' + helpers.addError(listUsers));
			return callback(null, results, source);
		}

		if (!listUsers.data.length) {
			helpers.addResult(results, 0, 'No user accounts found');
			return callback(null, results, source);
		}

		async.each(listUsers.data, function(user, cb){
			var goodUser = true;

			if (!user.UserName) return cb();

			var listAttachedUserPolicies = helpers.addSource(cache, source,
					['iam', 'listAttachedUserPolicies', region, user.UserName]);

			var listUserPolicies = helpers.addSource(cache, source,
					['iam', 'listUserPolicies', region, user.UserName]);


			if (!listAttachedUserPolicies) return cb(null, results, source);

			if (listAttachedUserPolicies.err || !listAttachedUserPolicies.data ||
				listUserPolicies.err || !listUserPolicies.data) {
				helpers.addResult(results, 3, 'Unable to query policies for user: ' +
					user.UserName, 'global', user.Arn);
				return cb();
			}

			if ((listAttachedUserPolicies.data.AttachedPolicies &&
				listAttachedUserPolicies.data.AttachedPolicies.length) ||
			   (listUserPolicies.data.PolicyNames &&
				listUserPolicies.data.PolicyNames.length)) {
				helpers.addResult(results, 1, 'User is using attached or inline policies', 'global', user.Arn);
			} else {
				helpers.addResult(results, 0, 'User is not using attached or inline policies', 'global', user.Arn);
			}

			cb();
		}, function(){
			callback(null, results, source);
		});
	}
};