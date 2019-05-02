/*__________________________________________________________________________*/
const fs = require('fs');
const replaceStream = require('replacestream');
const split = require('split');
const util = require('util');
util.inspect.defaultOptions.depth = null;
util.inspect.defaultOptions.maxArrayLength = null;
util.inspect.defaultOptions.showHidden = false;
/*__________________________________________________________________________*/

const LOG = false

/**
 * UTILS
 */
function extractHostname(url) {
  var hostname;
  //find & remove protocol (http, ftp, etc.) and get hostname

  if (url.indexOf("//") > -1) {
      hostname = url.split('/')[2];
  }
  else {
      hostname = url.split('/')[0];
  }

  //find & remove port number
  hostname = hostname.split(':')[0];
  //find & remove "?"
  hostname = hostname.split('?')[0];

  return hostname;
}


/**
 * TWEET FILE PARSERS
 */

 /* Load coin list */
const coinList = fs.readFileSync('top100coins.txt').toString().split("\n");

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
var hashtagsCount = {}
var symbolsCount = {}
var mentionsCount = {}
var wordsCount = {}
var urlsCount = {}
var coinStats = {}

for(c of coinList) {  
  coinStats[c] = {
    // "aliases": [],
    "count": 0,
    "hashtags": {},
    "symbols": {},
    "mentions": {},
    "words": {},
    "urls": {} //TODO save domains only
  }
}


//TODO Avoid duplicates in same tweet (don't count a keyword twice)
//TODO Write function to link a keyword to a coin (BTC, #Bitcoin, bitcoin, $Bitcoin) - can we generalize it?
function analyzeTwit(tw) {
  var curTweet = {
    "hashtags" : [],
    "symbols" : [],
    "mentions": [],
    "words" : [],    
    "urls": [],
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

  //_ LOG text _/
  if(LOG){
    console.log('||||||||||||||||||||||||||||\n'+text+'\n||||||||||||||||||||||||||||')
  }

  /* Parse Tweet */
  var words = text.match(/http[^\s]*|[#@$]?[a-zA-Z0-9]+/g)
  
  if(words[0]=='RT') words.splice(0,1)
  words.map(function (word) {
    if(LOG) console.log(word)

    if(word.substring(0,7)!="http://" && word.substring(0,8)!="https://"){
      var list
      const char0 = word.charAt(0);

      switch(char0) {
        case '@':
        case '#':
        case '$':
          word = word.substr(1)
          switch(char0){
            case '@':
              list = curTweet.mentions
              break;
            case '#':
              list = curTweet.hashtags
              break;
            case '$':
              list = curTweet.symbols
              break;
          }
        break;

        default:
            list = curTweet.words
      }

      /* Add keyword to curTweet list */
      if(!list.includes(word))
        list.push(word)

      /* Keep track of mentioned coins */
      if(coinList.includes(word) && !curTweet.coins.includes(word)) //TODO Check coin aliases?
        curTweet.coins.push(word)
    }
  });

  /* Parse URLs */
  for(u of tweet.entities.urls){
    const url = extractHostname(u.expanded_url)
    if(LOG) console.log("URL: "+url);
    
    /* Add keyword to curTweet list */
    if(!curTweet.urls.includes(url))
      curTweet.urls.push(url)
  }

  if(LOG) console.log(inspectObject(curTweet))


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
    if(hashtagsCount[h])
      hashtagsCount[h]++;
    else
      hashtagsCount[h]=1;

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

  /* Update mentions stats */
  for(m of curTweet.mentions){
    /* Global Stats */
    if(mentionsCount[m])
      mentionsCount[m]++;
    else
      mentionsCount[m]=1;

    /* Coin Stats */
    for(c of curTweet.coins){
      if(coinStats[c].mentions[m])
        coinStats[c].mentions[m]++;
      else
        coinStats[c].mentions[m]=1;
    }
  }

  for(u of curTweet.urls){
    /* Global Stats */
    if(urlsCount[u])
      urlsCount[u]++;
    else
      urlsCount[u]=1;

    /* Coin Stats */
    for(c of curTweet.coins){
      if(coinStats[c].urls[u])
        coinStats[c].urls[u]++;
      else
        coinStats[c].urls[u]=1;
    }
  }

  /* Update words stats */
  for(w of curTweet.words){
    /* Global Stats */
    if(wordsCount[w])
      wordsCount[w]++;
    else
      wordsCount[w]=1;

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
const mentionStatsFile = 'mention-stats.txt'
const urlStatsFile = 'url-stats.txt'
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
  fs.writeFileSync(statsfolder+hashtagStatsFile, inspectObject(getSortedDict(hashtagsCount)), 'utf-8');
  fs.writeFileSync(statsfolder+mentionStatsFile, inspectObject(getSortedDict(mentionsCount)), 'utf-8');
  fs.writeFileSync(statsfolder+urlStatsFile, inspectObject(getSortedDict(urlsCount)), 'utf-8');
  fs.writeFileSync(statsfolder+wordStatsFile, inspectObject(getSortedDict(wordsCount)), 'utf-8');

  fs.writeFileSync(statsfolder+coinStatsFile, inspectObject(coinStats), 'utf-8'); 

  //TODO Try console.table() - print table with elements of array
}

/* RUN */
parseTweetFile(tweetfile)
