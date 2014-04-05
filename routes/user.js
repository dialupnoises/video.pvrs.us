var passport       = require('passport'),
	GoogleStrategy = require('passport-google').Strategy;

var Site, app;

exports.initialize = function(_Site)
{
	Site = _Site;
	app = Site.App;

	var the_list = [
		'rogersa@pioneervalley.k12.ma.us'
	];

	app.get('/login/teacher', passport.authenticate('google_teacher', { failureRedirect: '/login' }),
		function(req, res) {
			res.redirect('/');
		}
	);

	app.get('/login/teacher/callback', passport.authenticate('google_teacher', { failureRedirect: '/login' }), 
		function(req, res) { 
			res.redirect('/'); 
		}
	);

	app.get('/logout', function(req, res) {
		req.logout();
		res.redirect('/');
	});

	passport.use('google_teacher', new GoogleStrategy({
			returnURL: 'http://' + Site.Domain + '/login/teacher/callback',
			realm: 'http://' + Site.Domain + '/',
			hd: 'pvrsd.pioneervalley.k12.ma.us'
		},
		function(id, profile, done) {
			if(!/^.+?@pvrsd\.pioneervalley\.k12\.ma\.us$/.test(profile.emails[0].value) && the_list.indexOf(profile.emails[0].value) == -1)
				return done('You must use a teacher email!', profile);
			done(null, profile);
		})
	);

	passport.serializeUser(function(user, done) {
		done(null, user);
	});

	passport.deserializeUser(function(obj, done) {
		done(null, obj);
	});
}