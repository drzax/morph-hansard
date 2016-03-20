var cheerio = require('cheerio');
var request = require('request');
var fs = require('fs');
var queue = require('d3-queue').queue(10);
var slug = require('slug');

var outStreams = {
	parl: fs.createWriteStream('./data/parliament.md'),
	reps: fs.createWriteStream('./data/reps.md'),
	senate: fs.createWriteStream('./data/senate.md')
};

const chambers = [{
        name: 'reps',
	path: 'http://data.openaustralia.org/scrapedxml/representatives_debates/'
},{
        name: 'senate',
	path: 'http://data.openaustralia.org/scrapedxml/senate_debates/'
}];

chambers.forEach(function(chamber){
        console.log('Request: '+chamber.path);
        request(chamber.path, function(error,response,body){
                var $ = cheerio.load(body);

                $('a').filter(function(){
                        return $(this).attr('href').match('[0-9]{4}-[0-9]{2}-[0-9]{2}');
                }).each(function(){
                        var xmlPath = chamber.path + $(this).attr('href');
                        queue.defer(requestXml({chamber:chamber,xmlPath:xmlPath}));
		});
	});
});

function requestXml(opts) {
	return function(cb){
		console.log('Request: '+opts.xmlPath);
		opts.cb = cb;
		request(opts.xmlPath, handleXml.bind(opts));
	};
}

function handleXml(err, res, body) {

        var opts = this;

	if (err) {
		return console.error(err);
	}

	var $ = cheerio.load(body);

        $('speech').each(function(){
                var content = '';
                var $speech = $(this);
                var speaker = $speech.attr('speakername');
		if (speaker) {
                        var speakerId = $speech.attr('speakerid');
                        speakerId = speakerId.slice(speakerId.lastIndexOf('/')+1);

                        var speakerSlug = slug(speakerId + ' ' + speaker, {lower: true});

			// Does this speaker need a stream?
			if (!outStreams[speakerSlug]) {
				outStreams[speakerSlug] = fs.createWriteStream('./data/'+speakerSlug+'.md');
			}

			// Output to all the places
			content += '# ' + speaker + '\n';

			$speech.find('p').each(function(){
				var $par = $(this);
				var italic = $par.hasClass('italic');
				var text = $par.text().trim();

				if (italic) {
					content += '*'+text+'*\n';
				} else {
					content += text+'\n';
				}
			});

			outStreams.parl.write(content);
			outStreams[opts.chamber.name].write(content);
			outStreams[speakerSlug].write(content);

		}
	});

	opts.cb();
}