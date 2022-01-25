 const express = require('express');
 const path = require('path');
 const app = module.exports = express();

 const CONFIG = require('./config.json');
 const PORT = 3003;
 
 app.engine('.html', require('ejs').__express);
 app.set('views', path.join(__dirname, 'views'));
 app.use(express.static(path.join(__dirname, 'public')));
 app.set('view engine', 'html');
 
 
 app.get('/', function(req, res){
    const allStats = require('./stats.json');

    const CURRENT_WORDLE_NUMBER = CONFIG.baseWordleNumber + Math.floor((new Date() - Date.parse(CONFIG.baseDate)) / 86400000);

    const todayStats = allStats[CURRENT_WORDLE_NUMBER] || [];
    const yesterdayStats = allStats[CURRENT_WORDLE_NUMBER - 1] || [];

    const todayPlayerCount = todayStats.reduce((out, s) => out + s.count, 0);
    const yesterdayPlayerCount = yesterdayStats.reduce((out, s) => out + s.count, 0);

    res.render('index', {
        wordleNumber: CURRENT_WORDLE_NUMBER,
        todayStats,
        yesterdayStats,
        todayPlayerCount,
        yesterdayPlayerCount,
        title: 'Wordle Stats'
    });
 });
 
 /* istanbul ignore next */
 if (!module.parent) {
   app.listen(PORT);
   console.log(`Express started on port ${PORT}`);
 }