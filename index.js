const { Client } = require("discord.js");
const bot = new Client();
const token = require("./token.json");

const ytdl = require("ytdl-core");
const puppeteer = require("puppeteer");

// WRITE YOUR PREFIX HERE
const PREFIX = "";

let servers = {};

bot.on("ready", () => {
    console.log("Online!");
});

bot.on("message", message => {

    const prefixMessage = message.content.split("")[0];
    if(prefixMessage !== PREFIX) return;

    let args = message.content.substring(PREFIX.length).split(" ");

    switch (args[0]) {

        case "play":
            message.channel.send("Please wait a sec...");

            function play (connection, message){
                let server = servers[message.guild.id];

                server.dispatcher = connection.play(ytdl(server.queue[0], { filter: "audioonly" }));

                server.queue.shift();

                server.dispatcher.on("finish", function(){
                    if(server.queue[0]){
                        play(connection, message);
                    }else{
                        connection.disconnect();
                    }
                });
            }

            async function scrapeMusic(url){
                const browser = await puppeteer.launch();
                const page = await browser.newPage();
                await page.goto(url);
            
                const [el] = await page.$x('//*[@id="video-title"]');
                const href = await el.getProperty("href");
                const hrefTxt = await href.jsonValue();
            
                browser.close();
                return hrefTxt;
            }

            if(!args[1]){
                message.channel.send("You need to send a link!");
                return;
            }

            if(!message.member.voice.channel){
                message.channel.send("Join to some channel");
                return;
            }

            if(!servers[message.guild.id]) servers[message.guild.id] = {
                queue: []
            };

            let server = servers[message.guild.id];

            let ytbUrl = args[1].split("=");
            
            if(ytbUrl[0] === "https://www.youtube.com/watch?v") {
                server.queue.push(args[1]);
                message.channel.send("Added to queue!");
            }else{
                args.shift();
                let musicName = args.join("+");
                let searchUrl = `https://www.youtube.com/results?search_query=${musicName}`;
                scrapeMusic(searchUrl).then((result) => {
                    server.queue.push(result);
                    message.channel.send(`${result} is on queue`);
                 })
               
            }

            const startMusic = () => {
                if(!message.guild.me.voice.connection) message.member.voice.channel.join().then( ( connection ) => {
                    play(connection, message);
                });
            }
            setTimeout(startMusic, 8000)
        break;

        case "skip":
            let serverSkip = servers[message.guild.id];

            if(message.guild.voice && message.guild.me.voice ){
                if(serverSkip){
                    if(serverSkip.dispatcher) serverSkip.dispatcher.end();
                    message.channel.send("Music skipped.");
                }else{
                    message.channel.send("Nothing to skip.");
                }
            }else{
                message.channel.send("I need to be on a voice channel.");
            }

        break;

        case "stop":
            let serverStop = servers[message.guild.id];

            if(message.guild.voice && message.guild.me.voice ){
                if(message.guild.voice.connection){
                    for(let i = serverStop.queue.length -1; i>= 0; i--){
                        serverStop.queue.split(i, 1);
                    }
                    message.channel.send("End of list. I'm leaving.");
                    serverStop.dispatcher.end()
                }
            }else{
                message.channel.send("I need to be on a voice channel.");
            }
            
        break;

        case "leave":
            if(message.guild.voice){
                if(message.guild.voice.connection) message.guild.voice.connection.disconnect();
            }else{
                message.channel.send("I need to be on a voice channel.");
            }
        break;

    }
});

bot.login(token.BOT_TOKEN);