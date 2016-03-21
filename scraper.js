#! /usr/bin/env node

var cheerio = require('cheerio');
var request = require('request');
var queue = require('d3-queue').queue(10);
var sqlite = require('sqlite3');
var tomd = require('to-markdown');

const chambers = [{
  name: 'House',
  path: 'http://data.openaustralia.org/scrapedxml/representatives_debates/'
},{
  name: 'Senate',
  path: 'http://data.openaustralia.org/scrapedxml/senate_debates/'
}];

// Set up sqlite database.
var db = new sqlite.Database("data.sqlite");
db.serialize(function() {
  db.run("CREATE TABLE IF NOT EXISTS data (speech_id TEXT PRIMARY KEY, chamber TEXT, debate_type TEXT, debate_subject TEXT, speaker_id TEXT, speaker_name TEXT, speech TEXT)");
  start(db);
});

function start(db) {
  chambers.forEach(function(chamber){
    console.log('Request: '+chamber.path);
    request(chamber.path, function(error,response,body){
      var $ = cheerio.load(body);

      $('a').filter(function(){
        return $(this).attr('href').match('[0-9]{4}-[0-9]{2}-[0-9]{2}');
      }).each(function(){
        var xmlPath = chamber.path + $(this).attr('href');
        queue.defer(requestXml({db:db,chamber:chamber,xmlPath:xmlPath}));
      });
    });
  });
}

function requestXml(opts) {
  return function(cb){
    console.log('Request: '+opts.xmlPath);
    opts.cb = cb;
    request(opts.xmlPath, handleXml.bind(opts));
  };
}

function handleXml(err, res, body) {

  var major, minor, opts = this;

  if (err) {
    return console.error(err);
  }

  var $ = cheerio.load(body);

  $('debates').children('speech,major-heading,minor-heading').each(function(){

    var data = {}, node = this, $node = $(this);

    // Just note for late if it's a heading
    if (node.name === 'major-heading') {
      major = $(node).text().trim() || null;
      return;
    }

    if (node.name === 'minor-heading') {
      minor = $(node).text().trim() || null;
      return;
    }

    // Okay, we have speech lets parse it
    data.$speech_id = $node.attr('id');
    data.$chamber = opts.chamber.name;
    data.$debate_type = major;
    data.$debate_subject = minor;
    data.$speaker_id = $node.attr('speakerid');
    data.$speaker_name = $node.attr('speakername');
    data.$speech = tomd($node.html(),{
      gfm: true,
      converters: [{
        filter: 'dd',
        replacement: function(content) {
          content = content.replace(/^\s+/, '').replace(/\n/gm, '\n    ');
          return ': ' + content;
        }
      },{
        filter: 'dt',
        replacement: function(content) {
          content = content.replace(/^\s+/, '').replace(/\n/gm, '\n    ');
          return content;
        }
      },{
        filter: 'dl',
        replacement: function (content, node) {
          var strings = [];
          for (var i = 0; i < node.childNodes.length; i++) {
            strings.push(node.childNodes[i]._replacement);
          }
          return '\n\n' + strings.join('\n') + '\n\n';
        }
      }]
    });

    // Save to DB
    updateRow(opts.db, data);

  });

  opts.cb();
}

function updateRow(db, values) {
	// Insert some data.
	var statement = db.prepare("INSERT OR REPLACE INTO data VALUES ($speech_id, $chamber, $debate_type, $debate_subject, $speaker_id, $speaker_name, $speech)");
	statement.run(values);
	statement.finalize();
}