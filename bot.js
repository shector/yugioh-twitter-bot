const fetch = require("node-fetch");
const fs = require("fs");
const https = require('https');

const {client} = require("./secret");

// Download everything once
var CARD_DB = {};

// Use Card Set to ensure no repeats. 
const card_set = new Set();

async function setUp() {
    const response = await fetch('https://db.ygoprodeck.com/api/v7/cardinfo.php');
    if (!response.ok) {
        throw new Error(`Oops! ${response.statusText}`);
    } else {
        let json_response = await response.json();
        CARD_DB = json_response.data;
        console.log('database download complete!')
    }
}

function getCard() {
    if (Object.keys(CARD_DB).length === 0) throw new Error('ERROR LOADING DB.');

    return CARD_DB[Math.floor(Math.random() * Object.keys(CARD_DB).length)];
}

function maybeTrimTweet(tweet) {
    if (tweet.length > 280) return tweet.substring(0, 277) + '...';
    return tweet;
}

async function downloadImage(url) {
    const file = fs.createWriteStream('image.jpg')
    const request = https.get(url, function(response) {
        response.pipe(file);
        console.log('file download complete');
    });
}

function tweet() {
    let card = getCard();

    // No repeats.
    while (card_set.has(card.id)) {
        card = getCard();
    }

    card_set.add(card.id);
    let tweet_body = "";
    const image_url = card.card_images[0].image_url

    switch(card.type) {
        case 'Normal Monster':
        case 'Effect Monster':
        case 'Synchro Monster':
        case 'Union Effect Monster':
        case 'Flip Effect Monster':
        case 'Fusion Monster':
            tweet_body = `${card.name}\nLEVEL ${card.level} ${card.race}`
            + ` TYPE MONSTER[${card.attribute}]\n${card.desc}`
            break;
        case 'Tuner Monster':
            tweet_body = `${card.name}\nLEVEL ${card.level} ${card.race}`
            + ` TYPE TUNER[${card.attribute}]\n${card.desc}`
            break;
        case 'XYZ Monster':
            tweet_body = `${card.name}\nRANK ${card.level} ${card.race}`
            + ` TYPE MONSTER[${card.attribute}]\n${card.desc}`
            break;
        case 'Pendulum Effect Monster':
            tweet_body = `${card.name}\nLEVEL ${card.level} ${card.race}`
            + ` TYPE Scale ${card.scale} PENDULUM[${card.attribute}]\n`
            + `Pendulum Effect: ${card.desc.substring(21)}`
            break;
        case 'Link Monster':
            tweet_body = `${card.name}\nLINK ${card.linkval} ${card.race}`
            + ` TYPE MONSTER[${card.attribute}]\n${card.desc}`
            break;
        case 'Spell Card':
            tweet_body = `${card.name}\n[Spell/${card.race}]\n${card.desc}`
            break;
        case 'Trap Card':
            tweet_body = `${card.name}\n[Trap/${card.race}]\n${card.desc}`
            break;
        default: // Anything else i missed
            tweet_body = `${card.name}\n${card.desc}`
            break;
    }

    tweet_body = maybeTrimTweet(tweet_body);
    // saved to image.jpg. Have to force the sync so we can use file immediately.
    downloadImage(image_url);

    // Keep a log of what is being sent out.
    console.log(tweet_body);

    // Insert some wait to let the image download complete. A bit unhealthy
    // but shouldn't be an issue for this application. 
    setTimeout(() => {
        const content = fs.readFileSync('image.jpg', {encoding: 'base64'})
        
        // Upload Image and then tweet! Example from https://github.com/ttezel/twit.
        client.post('media/upload', { media_data: content }, function (err, data, response) {
            if (err) console.log(err)
            console.log(data)
            
            // now we can assign alt text to the media, for use by screen readers and
            // other text-based presentations and interpreters
            const media_id = data.media_id_string
            const altText = `Yugioh Card: ${card.name}`
            const meta_params = { media_id: media_id, alt_text: { text: altText } }
          
            client.post('media/metadata/create', meta_params, function (err, data, response) {
                if (!err) {
                // now we can reference the media and post a tweet (media will attach to the tweet)
                const params = { status: tweet_body, media_ids: [media_id] }
          
                client.post('statuses/update', params, function (err, data, response) {
                  console.log(data)
                })
              }
            })
          })
    }, 1000 * 6); // 6 second wait.
}

async function main() {
    await setUp();
    tweet(); // ugly workaround to start immediately.
    setInterval(() => { tweet() }, 1000 * 60 * 60 * 6);  // tweet every 6 hours
}

main();