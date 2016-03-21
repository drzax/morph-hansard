#! /usr/bin/env node

var sqlite = require('sqlite3');
var argv = require('yargs')
  .usage('Usage: $0 <command> [options]')
  .command('senate', 'Extract speech from the senate.')
  .command('house', 'Extract speech from the house.')
  .alias('s', 'speaker')
  .describe('s', 'Restrict output to a single speaker_id')
  .alias('t', 'type')
  .describe('t', 'Restrict output to a speech type (e.g. QUESTIONS WITHOUT NOTICE)')
  .help('h')
  .argv;

var db = new sqlite.Database("data.sqlite");

var params = {$chamber: argv._[0].charAt(0).toUpperCase() + argv._[0].slice(1)};
if (!!argv.speaker) {
  params.$speaker_id = argv.speaker;
}
if (!!argv.type) {
  params.$debate_type = argv.type;
}

db.each(
  getQuery(params),
  params,
  printRow
);

function getQuery(params) {
  var keys = Object.keys(params).map(function(d){return d.replace('$','')+'='+d;});
  return 'select speaker_name, speech from data where '+keys.join(' and ')+' order by speech_id';
}

function printRow(err, row) {
  if (err) {
    throw err;
  }
  var name = row.speaker_name || 'Unknown';
  process.stdout.write('# ' + name + '\n' + row.speech + '\n\n');
}