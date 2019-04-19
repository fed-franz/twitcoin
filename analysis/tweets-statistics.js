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
    try {
      var tw = JSON.parse(obj)
      analyzeTwit(tw)
    } catch (e) {
      return console.error(e+'\n'+obj);
    }
    tcount++;
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
var symbolsCount = {}
var wordCount = {}

function analyzeTwit(tw) {

  // Print tweet ID
  console.log('\n'+JSON.stringify(tw.id_str))

  /* WORD ANALYSIS */
  //Most common words
  //ISSUE: how to exclude common words? - i.e. how to select relevant words?

  //Tweet elements
  var tweet
  var text
  var hashtags
  var words

  if(tw.truncated == true){
    tweet = tw.extended_tweet
    text = tweet.full_text
  }
  else{
    tweet = tw
    text = tweet.text
  }
  
  hashtags = tweet.entities.hashtags
  symbols = tweet.entities.symbols

  console.log('||||||||||||||||||||||||||||')
  console.log(text)
  console.log('||||||||||||||||||||||||||||')

  // Count hashtags
  hashtags.forEach(tag => {
    console.log('#'+tag.text)
    if(hashtagCount[tag.text])
      hashtagCount[tag.text]+=1;
    else
      hashtagCount[tag.text]=1;
  });

  // Count symbols ($)
  symbols.forEach(sym => {
    console.log('$'+sym.text)
    if(symbolsCount[sym.text])
      symbolsCount[sym.text]+=1;
    else
      symbolsCount[sym.text]=1;
  });

  // TODO Count URLs
  // TODO Mentions

  // Count words
  var arr = text.split(" ")
  if(arr[0]=='RT') arr.splice(0,1)
  arr.map(function (word) {
    word=word.trim() //Remove leading and trailing spaces
    //TODO Remove leading and trailing special chars --> ": , ! . < ; ' " > [ ] { } ` ~ = + - ? /"

    //word=word.split('@')[0] //TODO Handle # @ $ signs in the middle of a word --> split all chars at text level
    if(word.charAt(0)!='#' && word.charAt(0)!='$' && word.charAt(0)!='@' && word.substring(0,4) != "http" && word!=''){
      console.log('"'+word+'"')
      if(wordCount[word])
        wordCount[word]+=1;
      else
        wordCount[word]=1;  
    }
  });

  console.log('.');
  
}

/**
 * OUTPUT
 */
var statsfolder = '../data/stats/'
var hashtagStatsFile = 'hashtag-stats.txt'
var symbolStatsFile = 'symbol-stats.txt'
var wordStatsFile = 'word-stats.txt'

/* getSortedDict */
function getSortedDict(dict){
  // Create items array
  var items = Object.keys(dict).map(function(key) {
    return [key, dict[key]];
  });

  // Sort the array based on the second element
  items.sort(function(first, second) {
    return second[1] - first[1];
  });

  const inspectOptions = {showHidden: false, depth: null, maxArrayLength: null}
  return util.inspect(items, inspectOptions); 
}

/* Output results */
function showResults() {
  console.log("Total Number of tweets: "+tcount)

  // Check and create Stats folder
  if (!fs.existsSync(statsfolder)){
    fs.mkdirSync(statsfolder);
  }

  fs.writeFileSync(statsfolder+hashtagStatsFile, getSortedDict(hashtagCount), 'utf-8'); 
  fs.writeFileSync(statsfolder+symbolStatsFile, getSortedDict(symbolsCount), 'utf-8'); 
  fs.writeFileSync(statsfolder+wordStatsFile, getSortedDict(wordCount), 'utf-8'); 

  //TODO Try console.table() - print table with elements of array
}

/* RUN */
parseTweetFile(tweetfile)
