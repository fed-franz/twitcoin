/*__________________________________________________________________________*/
const util = require('util')
util.inspect.defaultOptions.depth = null;
util.inspect.defaultOptions.maxArrayLength = null;
util.inspect.defaultOptions.showHidden = false;
/*__________________________________________________________________________*/


/**
 * TWEET FILE PARSERS
 */
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
var n = 1

function parseTweetFile(filename) {
  var curFile = filename+'-'+n
  console.log("Parsing "+curFile);
  
  if (!fs.existsSync(curFile)) {
    return showResults()
  }

  var readStream = fs.createReadStream(curFile)
  .pipe(replaceStream("}{", "}\n{"))
  .pipe(split("\n"))

  .on('data', function (obj) {
    tcount++;

    try {
      var tw = JSON.parse(obj)
      analyzeTwit(tw)
    } catch (e) {
      return console.error(e+'\n'+obj);
    }
  })
  
  readStream.on('error', function (err) {
    return console.log(err)
  })

  readStream.on('close', function () {
    n++
    parseTweetFile(filename) 
  })  
}

/**
 * TWEET FILE PARSERS
 */
var hashtagCount = {}

function analyzeTwit(tw) {

  /* WORD ANALYSIS */
  //Most common words
  //ISSUE: how to exclude common words? - i.e. how to select relevant words?

  //Hashtags
  console.log(JSON.stringify(tw.id_str))
  tw.entities.hashtags.forEach(tag => {
    console.log(tag.text)
    if(hashtagCount[tag.text])
      hashtagCount[tag.text]+=1;
    else
    hashtagCount[tag.text]=1;
    // console.log(hashtagCount[tag.text]);
    
  });

  /* COIN ANALYSIS */
  //Number of tweets per coin - i.e. most popular coins

  //Content of tweets? NLP problem - is there any tool?

  //Per each coin:
  //  - related keywords
  //  - related coins

  /* USER ANALYSIS */
  // Users analysis
  //  - retrieve users data
  //      - statistics
  //      - followers
}

/**
 * RENDERER
 */
var statsfolder = '../data/stats/'
var hashtagStatsFile = 'hashtag-stats.txt'

function showResults() {
  console.log("Total Number of tweets: "+tcount)

  // Create items array
  var items = Object.keys(hashtagCount).map(function(key) {
    return [key, hashtagCount[key]];
  });

  // Sort the array based on the second element
  items.sort(function(first, second) {
    return second[1] - first[1];
  });

  // console.log(util.inspect(items, {showHidden: false, depth: null}))

  fs.writeFileSync(statsfolder+hashtagStatsFile, util.inspect(items, {showHidden: false, depth: null, maxArrayLength: null}) , 'utf-8'); 

  //TODO Try console.table() - print table with elements of array
}

/* RUN */
parseTweetFile(tweetfile)
