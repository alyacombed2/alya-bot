const { Client, GatewayIntentBits } = require("discord.js");
const { backupServer, restoreServer, zipBackup, splitFile, nukeComBackup } = require("./systems/backupRestore");

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

// bot online (corrigido v14+)
client.once("clientReady", () => {
  console.log(`✅ Bot online como ${client.user.tag}`);
});

// comandos
client.on("messageCreate", async (message) => {
  if (!message.guild || message.author.bot) return;

  // 🔒 só você pode usar
  if (message.author.id !== "1372615579407618209") return;

  // 🔥 BACKUP COM DM + PARTES
  if (message.content === "!backup") {
    await message.reply("📦 Fazendo backup...");

    await backupServer(message.guild);

    const zipPath = await zipBackup(message.guild.id);

    try {
      const parts = splitFile(zipPath);

      const user = await client.users.fetch("1372615579407618209");
      const dm = await user.createDM();

      await message.reply(`📤 Enviando ${parts.length} partes na DM...`);

      for (let i = 0; i < parts.length; i++) {
        await dm.send({
          content: `📦 Parte ${i + 1}/${parts.length}`,
          files: [parts[i]]
        });

        await new Promise(res => setTimeout(res, 1500));
      }

      message.reply("✅ Backup enviado na DM!");
    } catch (err) {
      console.log("❌ ERRO DM:", err.message);
      message.reply("❌ Não consegui enviar na DM! (abre sua DM)");
    }
  }

  // 🔥 RESTORE (SEM APAGAR)
  if (message.content === "!restore") {
    await message.reply("♻️ Restaurando servidor...");
    await restoreServer(message.guild);
    message.reply("✅ Restore concluído!");
  }

  // 🔥 NUKE
  if (message.content === "!nuke") {
    await message.reply("💣 Fazendo backup + nuke...");
    await nukeComBackup(message.guild);
    message.reply("🔥 Servidor nukado com backup!");
  }
});

client.login(process.env.TOKEN);
