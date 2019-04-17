//TODO mv config to separate file
//TODO get 

var config = {
    consumer_key:         'XFaXfKNNlX6NZwT3wEydIqL4z',
    consumer_secret:      'TPmKHlhx3FK1MHKC3ZnksnPfqAidnuXJU97v5JHl7NULWmDZ3z',
    access_token:         '1094958996748943360-GJExatAZ47izJkTHcLsoSEYewDwE0g',
    access_token_secret:  'UDw8CK02SXPeg7PjR4rMLQq0X6YNAaRjoWdmEB77SchiA',
    timeout_ms:           60*1000,  // optional HTTP request timeout to apply to all requests.  
}

// const util = require('util');
const fs = require('fs')
const Twit = require('twit');
// const JSONC = require('jsoncomp');

// var Buffer = require('buffer').Buffer;
// var zlib = require('zlib');

var T = new Twit(config);

var kwfile = 'keywords.list'
var outfile = '../data/tweets-top100.json' //TODO Create file

var keywords = fs.readFileSync(kwfile, 'utf-8')
    .split('\n')
    .filter(Boolean);

var Tstream = T.stream('statuses/filter', { track: keywords, tweet_mode: 'extended' })
var Fstream = fs.createWriteStream(outfile, {flags:'w'});

// // FIX 'undefined Base64' error in jsoncomp.pack - https://github.com/tcorral/JSONC/issues/7
// global.Base64 = {
//     encode: function(str) {
//       return Buffer.from(str).toString('base64');
//     },
//   };
//   global.gzip = {
//     zip: function(str) {
//       return zlib.gzipSync(Buffer.from(str));
//     },
//   }

const nt = 100000
var count = nt;
var n = 1

Tstream.on('tweet', function (tweet) {
  // console.log(count);
    
  // var tobj = util.inspect(tweet,{depth: null})
  var tobj = JSON.stringify(tweet)
  Fstream.write(tobj);
  
  count--;
  if(count <= 0){
    Fstream.end();
    var newoutfile = outfile+'-'+n
    n++;
    fs.rename(outfile, newoutfile, function(err) {
        if ( err ) console.log('ERROR: ' + err);
    });
    Fstream = fs.createWriteStream(outfile, {flags:'w'});
    count = nt
  }
})