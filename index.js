const { Client, GatewayIntentBits } = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates
  ]
});

require("./systems/main")(client);
require("./systems/gfzin")(client);
require("./systems/coco")(client);

client.login(process.env.TOKEN)