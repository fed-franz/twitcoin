/*__________________________________________________________________________*/
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


// Get file pathname
const tweetfile = (process.argv.slice(2))[0]

if (tweetfile == null){
    console.log("ERR: filename required")
    process.exit()
}

// Import
var fs = require('fs'),
    replaceStream = require('replacestream'),
    split = require('split');

var tcount = 0; //Tweets counter

fs.createReadStream(tweetfile)
    .pipe(replaceStream("}{", "}\n{"))
    .pipe(split("\n"))

    .on('data', function (obj) {
      tcount++;

      try {
        var tw = JSON.parse(obj)
      } catch (e) {
        return console.error(e+'\n'+obj);
      }
      
      console.log('['+tcount+']'+tw.id)
    })
    
    .on('error', function (err) {
      console.log(err)
    })
