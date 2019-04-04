//Most common words
//ISSUE: how to exclude common words? - i.e. how to select relevant words?

//Tags

//Number of tweets per coin - i.e. most popular coins

//Content of tweets? NLP problem - is there any tool?

//Per each coin:
//  - related keywords
//  - related coins

// Users analysis
//  - retrieve users data
//      - statistics
//      - followers

/*__________________________________________________________________________*/



// Read JSON file
// ISSUE: do not read the entire file. How to load only a certain amount of data?
//  - JSON.parse()
//  - JSONStream -- JsonStream.parse(*.*) ?
/*
 npm install JSONStream

var fs = require('fs'),
    JSONStream = require('JSONStream');

var stream = fs.createReadStream('data.json', {encoding: 'utf8'}),
    parser = JSONStream.parse();

stream.pipe(parser);

parser.on('root', function (obj) {
  console.log(obj); // whatever you will do with each JSON object
});

*/

/**********************************************************************/

// Get file pathname
const tweetfile = (process.argv.slice(2))[0]

if (tweetfile == null){
    console.log("ERR: filename required")
    process.exit()
}

// Import
var fs = require('fs'),
    split = require('split')
    JSONStream = require('JSONStream');

var tcount = 0;

fs.createReadStream(tweetfile)
    .pipe(split("}{"))

    .on('data', function (obj) {
      tcount++;

      if(obj.charAt(0) == '{')
        obj = obj.substr(1, obj.length)
      if(obj.charAt(obj.length-1) == '}')
        obj = obj.substr(0, obj.length-1)

      try {
        var tw = JSON.parse('{'+obj+'}')
      } catch (e) {
        return console.error(e+'\n'+obj);
      }
      
      console.log('['+tcount+']'+tw.id)
    })

    .on('error', function (err) {
      console.log(err)
    })
    
    
