const cron = require('node-cron');
const run = require('./data-collect.js');

cron.schedule('0,15,30,45 * * * *', function() {
    try {
        run();
    } catch (e) {
        console.log(e);
    }
});