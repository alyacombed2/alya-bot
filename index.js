const { Client, GatewayIntentBits } = require("discord.js");
const { backupServer, restoreServer, nukeComBackup } = require("./systems/backupRestore");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates
  ]
});

// seus sistemas
require("./systems/main")(client);
require("./systems/gfzin")(client);
require("./systems/coco")(client);

// bot online
client.on("ready", () => {
  console.log(`✅ Bot online como ${client.user.tag}`);
});

// comandos
client.on("messageCreate", async (message) => {
  if (!message.guild || message.author.bot) return;

  // 🔒 só você pode usar
  if (message.author.id !== "1372615579407618209") return;

  if (message.content === "!backup") {
    await message.reply("📦 Fazendo backup...");
    await backupServer(message.guild);
    message.reply("✅ Backup concluído!");
  }

  if (message.content === "!restore") {
    await message.reply("♻️ Restaurando servidor...");
    await restoreServer(message.guild);
    message.reply("✅ Restore concluído!");
  }

  if (message.content === "!nuke") {
    await message.reply("💣 Fazendo backup + nuke...");
    await nukeComBackup(message.guild);
    message.reply("🔥 Servidor nukado com backup!");
  }
});

client.login(process.env.TOKEN);
