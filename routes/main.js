var querystring = require('querystring'),
	request = require('request'),
	dateformat = require('dateformat'),
	ytdl	   = require('ytdl'),
	http 	   = require('http'),
	ytdl_utils = require('../node_modules/ytdl/lib/util'),
	streamify  = require('streamify');
var Site, app;
var ytRegex = /(youtu\.be\/|youtube\.com\/(watch\?(.*&)?v=|(embed|v)\/))([^\?&"'>]+)/;

exports.initialize = function(_Site)
{
	Site = _Site;
	app = Site.App;

	app.get('/', function(req, res) {
		if(req.user) return res.redirect('/search');
		res.render('index');
	});

	app.get('/search', function(req, res) {
		//if(!req.user) return res.redirect('/');
		var query = req.query.q;
		if(!query || /^\s+$/.test(query))
			return res.render('search');
		if(ytRegex.test(query))
			res.redirect('/view/' + ytRegex.exec(query)[5]);
		search(query, req, res);
	});

	app.get('/user/:user', function(req, res) {
		//if(!req.user) return res.redirect('/');
		var user = req.params.user;
		if(!user || /^\s+$/.test(user))
			return res.render('search');
		search('', req, res, user);
	});
	
	app.get('/view/:id', function(req, res) {
		var id = req.params.id;
		if(!id) return res.status(404).render('not_found');
		request('https://gdata.youtube.com/feeds/api/videos/'+id+'?v2&prettyprint=true&alt=json', function(err, response, body) {
			if(err || response.statusCode != 200 && response.statusCode != 400)
				return res.status(500).render('error');
			if(response.statusCode == 400)
				return res.status(404).render('not_found');
			var data = JSON.parse(body);
			var v = data.entry;
			res.render('view', {
				video: {
					author: {
						name: v.author[0].name['$t'],
						username: v.author[0].uri['$t'].replace('https://gdata.youtube.com/feeds/api/users/', '')
					},
					title: v.title['$t'],
					uploaded: dateformat(new Date(v.published['$t']), 'mm/dd/yy hh:MM TT'),
					views: parseInt(v['yt$statistics'].viewCount).toMoney(),
					thumb: '/thumb/'+id,
					id: id
				}
			});
		});
	});

	app.get('/thumb/:id', function(req, res) {
		var id = req.params.id;
		if(!id) return res.status(404);
		res.type('image/jpeg');
		request.get('http://img.youtube.com/vi/'+id+'/hqdefault.jpg').pipe(res);
	});

	app.get('/stream/:id', function(req, res) {
		var id = req.params.id;
		if(!id) return res.status(404);
		res.type('video/mp4');
		var stream = streamify({
			superCtor: http.ClientResponse,
			readable: true,
			writable: false
		});
		if(req.headers['range'])
		{
			var range = req.headers.range;
			var parts = range.replace(/bytes=/, '').split('-');
			start = parseInt(parts[0], 10);
			end = parts[1] ? parseInt(parts[1], 10) : '';
		}
		ytdl.getInfo('http://www.youtube.com/watch?v=' + id, { filter: function(fmt) { return fmt.container == 'mp4'; }}, function(err, info) {
			var url = ytdl_utils.chooseFormat(info.formats, {filter: function(fmt) { return fmt.container == 'mp4' || fmt.container == 'flv'; }}).url;
			var start = 0, end = '', total = 0;
			console.log('Range: ' + start + ' - ' + end);
			if(start != 0 && end != '')
				var req = request({
					url: url,
					headers: {
						'Range': 'bytes=' + start + '-' + end
					}
				});
			else
				var req = request(url);
			req.pipe(res);
		});
	});
}

Number.prototype.toMoney = function(decimals, decimal_sep, thousands_sep)
{ 
   var n = this,
   c = isNaN(decimals) ? 2 : Math.abs(decimals),
   d = decimal_sep || '.',
   t = (typeof thousands_sep === 'undefined') ? ',' : thousands_sep,
   sign = (n < 0) ? '-' : '',
   i = parseInt(n = Math.abs(n).toFixed(c)) + '', 
   j = ((j = i.length) > 3) ? j % 3 : 0; 
   return sign + (j ? i.substr(0, j) + t : '') + i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + t);
}

function search(query, req, res, author)
{
	var page = ((req.query.page || 1) < 1 ? 1 : req.query.page || 1);
	var opts = {
		'q': query,
		'alt': 'json',
		'start-index': (page - 1) * 10 + 1,
		'max-results': 10,
		'v': 2
	};
	if(author) 
	{
		opts.author = author;
		opts.orderby = 'published';
	}
	var qs = querystring.stringify(opts);
	request('https://gdata.youtube.com/feeds/api/videos?' + qs, function(err, response, body) {
		if(err || response.statusCode != 200)
			return res.status(500).render('error');
		var entries = [];
		var data = JSON.parse(body);
		data.feed.entry.forEach(function(v) {
			var id = ytRegex.exec(v.link[0].href)[5];
			entries.push({
				author: {
					name: v.author[0].name['$t'],
					username: v.author[0].uri['$t'].replace('https://gdata.youtube.com/feeds/api/users/', '')
				},
				title: v.title['$t'],
				uploaded: dateformat(new Date(v.published['$t']), 'mm/dd/yy hh:MM TT'),
				views: parseInt(v['yt$statistics'].viewCount).toMoney(),
				thumb: 'http://img.youtube.com/vi/'+id+'/hqdefault.jpg',
				id: id
			});
		});
		res.render('search_results', {
			entries: entries,
			query: query,
			first_page: page == 1,
			page: page,
			author: author
		});
	});
}