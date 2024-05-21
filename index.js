const express = require("express");
const path = require("path");
const TelegramBot = require("node-telegram-bot-api");

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const gameName = "GamiflyGame";
const port = process.env.PORT || 3000;

const server = express();
const bot = new TelegramBot(TOKEN,{polling: false});
const queries = {};

// Help command
bot.onText(/\/help/, (msg) => {
    bot.sendMessage(msg.chat.id, "Say /game if you want to play.");
});

// Start or game command
bot.onText(/\/start|\/game/, (msg) => {
    bot.sendGame(msg.chat.id, gameName);
});

// Handle callback queries
bot.on("callback_query", (query) => {
    if (query.game_short_name !== gameName) {
        bot.answerCallbackQuery(query.id, "Sorry, '" + query.game_short_name + "' is not available.");
    } else {
        queries[query.id] = query;
        const gameUrl = "https://pump-it-bot.onrender.com/";
        bot.answerCallbackQuery({
            callback_query_id: query.id,
            url: gameUrl
        });
    }
});

// Handle inline queries
bot.on("inline_query", (iq) => {
    bot.answerInlineQuery(iq.id, [{
        type: "game",
        id: "0",
        game_short_name: gameName
    }]);
});

// Serve static files from the 'GamiflyGame' directory
server.use(express.static(path.join(__dirname, 'GamiflyGame')));

// Serve index.html as the root directory
server.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Handle high score updates
server.get("/highscore/:score", (req, res, next) => {
    if (!queries.hasOwnProperty(req.query.id)) return next();
    const query = queries[req.query.id];
    const options = query.message ? {
        chat_id: query.message.chat.id,
        message_id: query.message.message_id
    } : {
        inline_message_id: query.inline_message_id
    };

    bot.setGameScore(query.from.id, parseInt(req.params.score), options)
        .then(result => {
            res.send('Score updated');
        })
        .catch(err => {
            console.error(err);
            res.status(500).send('Error setting game score');
        });
});

// Error handling middleware
server.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

// Start the server
server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

// Add error handling for the bot

bot.on('webhook_error', (error) => {
    console.error(`Webhook error: ${error.code} - ${error.message}`);
});
