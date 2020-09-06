//  )pBmF3N"4!bJX,,P7Zh\v<
const Tweeter = require("twit")

var client = new Tweeter({ // Set in Heroku/
    consumer_key: process.env.TWITTER_CONSUMER_KEY,
    consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
    access_token: process.env.TWITTER_ACCESS_TOKEN,
    access_token_secret: process.env.TWITTER_ACCESS_SECRET,
    strictSSL: true,
    // bearer_token: process.env.TWITTER_BEARER_TOKEN
});

module.exports = { client: client }

