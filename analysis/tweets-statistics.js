/*__________________________________________________________________________*/
const fs = require('fs');
const replaceStream = require('replacestream');
const split = require('split');
const util = require('util');
util.inspect.defaultOptions.depth = null;
util.inspect.defaultOptions.maxArrayLength = null;
util.inspect.defaultOptions.showHidden = false;
/*__________________________________________________________________________*/


/* Load coin list */
const coinList = fs.readFileSync('top100coins.txt').toString().split("\n");
// for(c of coinList){
//   console.log(c)
// }

/**
 * TWEET FILE PARSERS
 */
// Get file pathname
const tweetfile = (process.argv.slice(2))[0]

if (tweetfile == null){
    console.log("ERR: filename required")
    process.exit()
}

//
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
      // console.log("<OBJ>\n"+obj+"\n</OBJ>")
      if(obj == '') return; //skip empty objects

      var tw = JSON.parse(obj)
      analyzeTwit(tw)
    } catch (e) {
      return console.error(e+'\n'+obj);
    }
    tcount++;
  })

  readStream.on('end', function () {
    return console.log("END")
  })
  
  readStream.on('error', function (err) {
    return console.log(err)
  })

  readStream.on('close', function () {
    n++
    //TODO if(filename)
    parseTweetFile(filename) 
  })  
}

/**
 * TWEET ANALYSIS
 */
var hashtagCount = {}
var symbolsCount = {}
var wordCount = {}
var coinStats = {} //TODO Load from top100coins

for(c of coinList) {
  // console.log(c);
  
  coinStats[c] = {
    "aliases": [],
    "count": 0,
    "symbols": {},
    "hashtags": {},
    "words": {}
  }
}


//TODO Avoid duplicates in same tweet (don't count a keyword twice)
//TODO Write function to link a keyword to a coin (BTC, #Bitcoin, bitcoin, $Bitcoin) - can we generalize it?
function analyzeTwit(tw) {
  var curTweet = {
    "symbols" : [],
    "hashtags" : [],
    "words" : [],
    "coins": []
  }

  // Print tweet ID
  console.log('----------------------------')
  console.log('\n'+JSON.stringify(tw.id_str))

  //_ Set Tweet Elements _//
  var tweet
  var text
  if(tw.truncated == true){
    tweet = tw.extended_tweet
    text = tweet.full_text
  }
  else{
    tweet = tw
    text = tweet.text
  }  
  var hashtags = tweet.entities.hashtags
  var symbols = tweet.entities.symbols
  //var words

  //_ LOG text _/
  console.log('||||||||||||||||||||||||||||')
  console.log(text)
  console.log('||||||||||||||||||||||||||||')

  /* Symbols ($) */
  symbols.forEach(sym_obj => {
    const sym = sym_obj.text
    console.log('$'+sym)

    /* Add symbol to list */
    if(!curTweet.symbols.includes(sym)) //TODO Shall we include duplicates?
      curTweet.symbols.push(sym)

    /* Keep track of mentioned coins */
    if(coinList.includes(sym) && !curTweet.coins.includes(sym)){
      curTweet.coins.push(sym)
    }
  });

  /* Hashtags */
  hashtags.forEach(tag_obj => {
    const tag = tag_obj.text
    console.log('#'+tag)

    /* Add symbol to list */
    if(!curTweet.hashtags.includes(tag)) //TODO Shall we include duplicates?
      curTweet.hashtags.push(tag)

    /* Keep track of mentioned coins */
    if(coinList.includes(tag) && !curTweet.coins.includes(tag)){ //TODO Check coin aliases?
      curTweet.coins.push(tag)
    }
  });

  // TODO Count URLs
  // TODO Mentions

  /* Words */
  // TODO Use parser to count hashtags/symbols/mentions/URLs ? -- this would include also hashtags not detected by Twitter
  var arr = text.split(" ")
  if(arr[0]=='RT' || arr[0].charAt(0)=='@') arr.splice(0,1)
  arr.map(function (word) {
    word=word.trim() //Remove leading and trailing spaces
    //TODO Remove leading and trailing special chars --> ": , ! . < ; ' " > [ ] { } ` ~ = + - ? /"
    //word=word.split('@')[0] //TODO Handle # @ $ signs in the middle of a word --> split all chars at text level

    const char0 = word.charAt(0);
    if(word!='' && char0!='#' && char0!='$' && char0!='@' && word.substring(0,4)!="http"){
      console.log('"'+word+'"')

      /* Add symbol to list */
      if(!curTweet.words.includes(word)) //TODO Shall we include duplicates?
        curTweet.words.push(word)

      /* Keep track of mentioned coins */
      if(coinList.includes(word) && !curTweet.coins.includes(word)){ //TODO Check coin aliases?
        curTweet.coins.push(word)
      }
    }
  });


  /*_____ UPDATE GLOBAL STATS _____*/
  // TODO write generic function ? -- we are repating the same code 3 times

  /* Update cross-coin stats */
  for(c of curTweet.coins){
    /* Increase per-coin tweet counter */
    coinStats[c].count++;

    // TODO Can we do this at the end, by counting h/s/w per-coin stats?
    // for(c2 of curTweet.coins){ 
    //   if(c2 != c){
    //     coinStats[c].coins[c2]
    //   }
    // }
  }

  /* Update hashtags stats */
  for(h of curTweet.hashtags){
    /* Global Stats */
    if(hashtagCount[h])
      hashtagCount[h]++;
    else
      hashtagCount[h]=1;

    /* Coin Stats */
    for(c of curTweet.coins){
      if(coinStats[c].hashtags[h])
        coinStats[c].hashtags[h]++;
      else
        coinStats[c].hashtags[h]=1;
    }
  }

  /* Update symbols stats */
  for(s of curTweet.symbols){
    /* Global Stats */
    if(symbolsCount[s])
      symbolsCount[s]++;
    else
      symbolsCount[s]=1;

    /* Coin Stats */
    for(c of curTweet.coins){
      if(coinStats[c].symbols[s])
        coinStats[c].symbols[s]++;
      else
        coinStats[c].symbols[s]=1;
    }
  }

  /* Update words stats */
  for(w of curTweet.words){
    /* Global Stats */
    if(wordCount[w])
      wordCount[w]++;
    else
      wordCount[w]=1;

    /* Coin Stats */
    for(c of curTweet.coins){
      if(coinStats[c].words[w])
        coinStats[c].words[w]++;
      else
        coinStats[c].words[w]=1;
    }
  }
  

  // console.log("RELATED: "+inspectObject(coinStats[sym].words));

  // End of tweet marker for log output
  console.log('.');
  
}

/**
 * OUTPUT
 */
const statsfolder = '../data/stats/'
const hashtagStatsFile = 'hashtag-stats.txt'
const symbolStatsFile = 'symbol-stats.txt'
const wordStatsFile = 'word-stats.txt'
const coinStatsFile = 'coin-stats.txt'

function inspectObject(obj){
  const inspectOptions = {showHidden: false, depth: null, maxArrayLength: null}
  return util.inspect(obj, inspectOptions); 
}

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

  return items
}

/* Output results */
function showResults() {
  console.log("Total Number of tweets: "+tcount)

  // Check and create Stats folder
  if (!fs.existsSync(statsfolder)){
    fs.mkdirSync(statsfolder);
  }

  fs.writeFileSync(statsfolder+symbolStatsFile, inspectObject(getSortedDict(symbolsCount)), 'utf-8'); 
  fs.writeFileSync(statsfolder+hashtagStatsFile, inspectObject(getSortedDict(hashtagCount)), 'utf-8'); 
  fs.writeFileSync(statsfolder+wordStatsFile, inspectObject(getSortedDict(wordCount)), 'utf-8'); 

  fs.writeFileSync(statsfolder+coinStatsFile, inspectObject(coinStats), 'utf-8'); 

  //TODO Try console.table() - print table with elements of array
}

/* RUN */
parseTweetFile(tweetfile)
