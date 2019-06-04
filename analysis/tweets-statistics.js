/*__________________________________________________________________________*/
const fs = require('fs');
const replaceStream = require('replacestream');
const split = require('split');
const util = require('util');
util.inspect.defaultOptions.depth = null;
util.inspect.defaultOptions.maxArrayLength = null;
util.inspect.defaultOptions.showHidden = false;
/*__________________________________________________________________________*/

const LOG = true

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

  //Get only main domain
  var htokens = hostname.split('.')
  var l = htokens.length;
  hostname = htokens[l-2]+'.'+htokens[l-1];

  return hostname;
}


/**
 * TWEET FILE PARSERS
 */

 /* Load coin list */
const dataDir = __dirname+'/data/'
const outDir = 'out'
const coinList = fs.readFileSync(dataDir+'top100coins.txt').toString().split("\n");
if(coinList[coinList.length-1]=='') coinList.pop() //Remove empty element
const coinNamesList = fs.readFileSync(dataDir+'top100coins-names.txt').toString().split("\n");
if(coinNamesList[coinNamesList.length-1]=='') coinNamesList.pop() //Remove empty element

/* Get tweet filenames */
const tweets_path = (process.argv.slice(2))[0]
if (tweets_path == null){
  console.log("ERR: filename required")
  process.exit()
}

var tweet_files = []

var tp_info = fs.lstatSync(tweets_path)
if (tp_info.isFile()) {
  tweet_files.push(tweets_path)
} else //If is a directory, get all .json files
  if (tp_info.isDirectory()) {
    fs.readdirSync(tweets_path).forEach(file => {
      if(file.includes('tweets') && file.includes('.json')){
        console.log(file);
        tweet_files.push(tweets_path+'/'+file)
      }
    });
} 

console.log("Files to parse: "+tweet_files);

if (tweet_files.length == 0) {
  console.log("ERR: path does not correspond to any tweets file")
  process.exit()
}

//
var tcount = 0; //Tweets counter

/**
 * TWEET ANALYSIS
 */
var usersCount = {}
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
    "users": {},
    "hashtags": {},
    "symbols": {},
    "mentions": {},
    "words": {},
    "urls": {},
    "coins": {}
  }
}

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
  if(LOG){
    console.log('----------------------------')
    console.log('\n'+JSON.stringify(tw.id_str))  
  }

  //_ Set Tweet Elements _//
  var tweet
  var text
  var rt = false
  if(tw.retweeted_status){
   rt = true
   tw = tw.retweeted_status 
  }
  if(tw.extended_tweet){
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
  var words = text.match(/(([£$€]?(\d+([%£$€]?|[\w]*))([.,:\/+-])?)*([£$€]?\d+[%£$€+\w]*))+|([@#$][\w\u00C0-\u00FF]+)|[^\w\s\u0100-\u1FFF@$#]|http[\S]+|([^@#$\uD800-\uDFFF\s?!&+,:;=|"'’‘–<>«».^*\\\/\[\]()%-]+['’-]?)*[^\uD800-\uDFFF\s?!&+,:;=|"'’‘–<>«».^*\\\/\[\]()%-]/g)
  if(!words){ console.error("ERROR: no words matched in: \n"+text); process.exit()}
  else{
    words.map(function (word) {
      word = word.trim()
      if(LOG) console.log(word)
  
      if(word.substring(0,7)!="http://" && word.substring(0,8)!="https://"){ //If not a link
        /* Map numbers to '.#.' */
        if(word.match(/^(([£$€]?(\d+([%£$€]?|[\w]*))([.,:\/+-])?)*([£$€]?\d+[%£$€+\w]*))+$|[#$@](?=[\s]|$)/g)){
          if(LOG) console.log("----->'.#.'");
          word = ".#."
        }
        else
        if(word.match(/^[&+,:;=|"'’‘–<>«».^*\\\/\[\]()%-]$/g)){
          if(LOG) console.log("----->'.'");
        }
        else
        /* Map '!','?', emoticons --> '.!?.' */ //TODO Sentiment Analysis
        if(word.match(/^([^\w\s\u0100-\u1FFF@$#])+$/g)){
          if(LOG) console.log("----->'.!?.'");
          word = '.!?.'
        }
        else{         
          var list
          const char0 = word.charAt(0)
    
          switch(char0) {
            case '@':
            case '#':
            case '$':
              word = word.substr(1)
              switch(char0){
                case '@':
                  list = curTweet.mentions
                  if(LOG) console.log("----->{mentions}");
                  break;
                case '#':
                  list = curTweet.hashtags
                  word = word.toLowerCase()
                  if(LOG) console.log("----->{hashtags}");
                  break;
                case '$':
                  list = curTweet.symbols
                  word = word.toUpperCase()
                  if(LOG) console.log("----->{symbols}");
                  break;
              }
            break;
    
            default:
              word = word.toLowerCase()
              list = curTweet.words
              if(LOG) console.log("----->{words}");
          }
    
          /* Add keyword to curTweet list */
          if(!list.includes(word))
            list.push(word)
    
          /* Keep track of mentioned coins */
          var word_uc = word.toUpperCase()
          if(coinList.includes(word_uc) && !curTweet.coins.includes(word_uc)){ //TODO Check coin aliases?
            curTweet.coins.push(word_uc)
            if(LOG) console.log("----->{COINS}");
          }
        }
      }
    });
  }  

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

  /* Update users stats */
  var u = tw.user.screen_name
  /* Global Stats */
  if(usersCount[u])
    usersCount[u]++;
  else
    usersCount[u]=1;

  /* Coin Stats */
  for(c of curTweet.coins){
    if(coinStats[c].users[u])
      coinStats[c].users[u]++;
    else
      coinStats[c].users[u]=1;
  }

  /* Update cross-coin stats */
  for(c of curTweet.coins){
    /* Increase per-coin tweet counter */
    coinStats[c].count++;

    // TODO Can we do this at the end, by counting h/s/w per-coin stats?
    for(c2 of curTweet.coins){ 
      if(c2 != c){
        if(coinStats[c].coins[c2])
          coinStats[c].coins[c2]++;
        else
          coinStats[c].coins[c2]=1;
      }
    }
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

  // End of tweet marker for log output
  if(LOG) console.log('.');
  
}

/**
 * OUTPUT
 */
const statsfolder = 'out/stats/'
const userStatsFile = 'user-stats.txt'
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

/* sortCoinStats */
function sortCoinStats(){
  var items = Object.keys(coinStats).map(function(coin){
    var stats=coinStats[coin]
    
    if (stats.count > 0) {      
      Object.keys(stats).map(function(counter) {
          if(counter != 'count')
            stats[counter] = getSortedDict(stats[counter])
        });
    }

    return [coin, stats]
  }); 

  items.sort(function(first, second) {
    return second[1]['count'] - first[1]['count'];
  });

  coinStats = items
}
  
/* Output results */
function saveResults() {
  console.log("Total Number of tweets: "+tcount)

  // Create output folder
  if (!fs.existsSync(outDir)){
    fs.mkdirSync(outDir);
  }

  // Check and create Stats folder
  if (!fs.existsSync(statsfolder)){
    fs.mkdirSync(statsfolder);
  }

  fs.writeFileSync(statsfolder+userStatsFile, inspectObject(getSortedDict(usersCount)), 'utf-8');
  fs.writeFileSync(statsfolder+symbolStatsFile, inspectObject(getSortedDict(symbolsCount)), 'utf-8');
  fs.writeFileSync(statsfolder+hashtagStatsFile, inspectObject(getSortedDict(hashtagsCount)), 'utf-8');
  fs.writeFileSync(statsfolder+mentionStatsFile, inspectObject(getSortedDict(mentionsCount)), 'utf-8');
  fs.writeFileSync(statsfolder+urlStatsFile, inspectObject(getSortedDict(urlsCount)), 'utf-8');
  fs.writeFileSync(statsfolder+wordStatsFile, inspectObject(getSortedDict(wordsCount)), 'utf-8');

  sortCoinStats()
  fs.writeFileSync(statsfolder+coinStatsFile, inspectObject(coinStats), 'utf-8');  //TODO getSortedObjArr(...) -> getSortedDict

  //TODO Try console.table() - print table with elements of array
}

/* RUN */
function parseTweets() {
    if(tweet_files.length == 0){
      console.log("___DONE___");
      return saveResults()
    }

    var curFile = tweet_files.shift()

    console.log("Parsing "+curFile);
  
    var readStream = fs.createReadStream(curFile)
    .pipe(replaceStream("}{", "}\n{"))
    .pipe(split("\n"))
  
    .on('data', function (obj) {
      try {
        // Skip empty objects
        if(obj == '') return;
  
        var tw = JSON.parse(obj)
        analyzeTwit(tw)
      } catch (e) {
        return console.error(e+'\n'+obj);
      }
      tcount++;
    })
  
    readStream.on('end', function () {
      return console.log("___END___")
    })
    
    readStream.on('error', function (err) {
      return console.log(err)
    })
  
    readStream.on('close', function () {
      parseTweets()
    })  
  }

  parseTweets()
  