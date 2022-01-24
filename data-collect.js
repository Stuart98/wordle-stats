const fs = require('fs');
const needle = require('needle');
const { start } = require('repl');

const CONFIG_PATH = './config.json'
const CONFIG = require(CONFIG_PATH);

const TWITTER_API_ENDPOINT = 'https://api.twitter.com/2/tweets/search/recent';
const POSS_SCORES = ['1', '2', '3', '4', '5', '6', 'X'];


CONFIG.lastQueryTime = CONFIG.lastQueryTime || CONFIG.baseDate;

const CURRENT_WORDLE_NUMBER = CONFIG.baseWordleNumber + Math.floor((new Date() - Date.parse(CONFIG.baseDate)) / 86400000);


async function fetchAllTweets(startDateTime, wordleNumber) {
    let data = await fetchPageTweets(startDateTime, wordleNumber);

    let token = data && data.meta && data.meta.next_token;
    let tweets = data.data;

    while (token) {
        data = await fetchPageTweets(startDateTime, wordleNumber, token);

        tweets = tweets.concat(data.data);
        token = data && data.meta && data.meta.next_token;
    }

    return tweets;
}


async function fetchPageTweets(startDateTime, wordleNumber, nextToken) {
    const params = {
        'query': `Wordle ${wordleNumber}`,
        'start_time': startDateTime,
        'max_results': 100,
        'tweet.fields': 'created_at'
    };

    if (nextToken) {
        params['next_token'] = nextToken;
    }

    const res = await needle('get', TWITTER_API_ENDPOINT, params, {
        headers: {
            'User-Agent': 'v2RecentSearchJS',
            'authorization': `Bearer ${CONFIG.bearerToken}`
        }
    });

    if (res.body) {
        return res.body;
    } else {
        throw new Error('Unsuccessful request');
    }
}

function _generateStats(wordleNumber, tweets) {
    const REGEX = new RegExp(`Wordle ${wordleNumber} ([\\d|X])\/6`);
    const POSS_SCORES = ['1', '2', '3', '4', '5', '6', 'X'];
  
    const text = tweets.filter((t) => t).map((t) => t.text);

    const scores = text.map((t) => {
        const res = t.match(REGEX);
        return res ? res[1] : false;
    }).filter((t) => t);
  
    const stats = POSS_SCORES.map((p) => {
        const count = scores.filter((s) => s === p).length;
        const percentage = Math.round(((count / scores.length) * 100) * 10) / 10;
  
      return {
        line: Array(Math.ceil(percentage)).fill('🟩').join(''),
        score: p,
        count,
        percentage,
      };
    });

    return stats;
}

function _getCurrentStats(wordleNumber) {
    return JSON.parse(fs.readFileSync(CONFIG.statsFile, 'utf8'));
}

function updateStats(wordleNumber, tweets) {
    const data = _getCurrentStats();
    const newStats = _generateStats(wordleNumber, tweets);
    let currentStats = data[wordleNumber];

    if (!currentStats) {
        data[wordleNumber] = POSS_SCORES.map((s) => ({ score: s, count: 0, percentage: 0 }));

        currentStats = data[wordleNumber]
    }

    POSS_SCORES.forEach((p) => {
        currentStat = currentStats.find((s) => s.score === p);
        newStat = newStats.find((s) => s.score === p);

        currentStat.count += newStat.count;
    });

    const totalResults = currentStats.reduce((out, s) => out + s.count, 0);

    currentStats.forEach((s) => {
        s.percentage = Math.round(((s.count / totalResults) * 100) * 10) / 10;
        s.line = Array(Math.ceil(s.percentage)).fill('🟩').join('');
    });

    return data;
}

function saveStats(stats) {
    fs.writeFileSync(CONFIG.statsFile, JSON.stringify(stats, null, 2));
}

function saveQueryTime(currentQueryTime) {
    CONFIG.lastQueryTime = currentQueryTime;

    fs.writeFileSync(CONFIG_PATH, JSON.stringify(CONFIG, null, 2));
}

async function run() {
    const currentQueryTime = new Date();
    const tweets = await fetchAllTweets(CONFIG.lastQueryTime, CURRENT_WORDLE_NUMBER);

    saveStats(updateStats(CURRENT_WORDLE_NUMBER, tweets));

    saveQueryTime(currentQueryTime);
}

module.exports = run;