var express = require('express'),
	colors  = require('colors'),
	stylus  = require('stylus'),
	nib		= require('nib'),
	passport = require('passport'),
	fs  	= require('fs');

var Site = {};
var PORT = process.env.PORT || 3001;

Site.Domain = process.env.NODE_ENV == 'production' ? 'video.pvrs.us' : 'localhost:3001';

var app = express();

app.configure(function() {
	app.set('views', __dirname + '/views');
	app.set('view engine', 'jade');
	app.use(express.bodyParser());
	app.use(express.cookieParser());
	app.use(express.session({secret: 'quote '}));
	app.use(express.logger('dev'));
	app.use(passport.initialize());
	app.use(passport.session());
	app.locals.pretty = !(process.env.NODE_ENV == 'production');
	app.use(stylus.middleware({
		src: __dirname + '/assets',
		dest: __dirname + '/public',
		debug: true,
		compile: function(str, path) {
			return stylus(str).set('filename', path).set('warn', true).set('compress', true).use(nib());
		}
	}));
	app.use(express.static(__dirname + '/public'));
});

Site.App = app;

require('./routes/main').initialize(Site);
require('./routes/user').initialize(Site);

app.listen(PORT);
console.log(('App listening on port ' + PORT).cyan);