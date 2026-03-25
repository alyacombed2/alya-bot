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

const OWNER_ID = "1372615579407618209";

require("./systems/main")(client);
require("./systems/gfzin")(client);
require("./systems/coco")(client);

client.once("clientReady", () => {
  console.log(`✅ Bot online como ${client.user.tag}`);
});




async function enviarBackupAutomatico(motivo = "Encerramento") {
  try {
    const guild = client.guilds.cache.first();
    if (!guild) return;

    const user = await client.users.fetch(OWNER_ID);
    const dm = await user.createDM();

    console.log(`📦 Backup automático iniciado (${motivo})`);

    await backupServer(guild);
    const zipPath = await zipBackup(guild.id);
    const parts = splitFile(zipPath);

    await dm.send(`⚠️ Bot finalizado (${motivo})\n📦 Enviando backup automático...`);

    for (let i = 0; i < parts.length; i++) {
      await dm.send({
        content: `📦 Parte ${i + 1}/${parts.length}`,
        files: [parts[i]]
      });

      await new Promise(res => setTimeout(res, 1200));
    }

    await dm.send("✅ Backup automático enviado!");
  } catch (err) {
    console.log("❌ Erro backup auto:", err.message);
  }
}




process.on("SIGINT", async () => {
  await enviarBackupAutomatico("SIGINT");
  process.exit();
});

process.on("SIGTERM", async () => {
  await enviarBackupAutomatico("SIGTERM (Railway)");
  process.exit();
});

process.on("uncaughtException", async (err) => {
  console.log("💥 ERRO:", err);
  await enviarBackupAutomatico("Erro crítico");
  process.exit(1);
});





setInterval(async () => {
  try {
    const guild = client.guilds.cache.first();
    if (!guild) return;

    console.log("💾 Backup automático periódico...");

    await backupServer(guild);
  } catch (err) {
    console.log("Erro auto backup:", err.message);
  }
}, 1000 * 60 * 10); 




client.on("messageCreate", async (message) => {
  if (!message.guild || message.author.bot) return;
  if (message.author.id !== OWNER_ID) return;

  if (message.content === "!backup") {
    await message.reply("📦 Fazendo backup...");

    await backupServer(message.guild);
    const zipPath = await zipBackup(message.guild.id);

    try {
      const parts = splitFile(zipPath);

      const user = await client.users.fetch(OWNER_ID);
      const dm = await user.createDM();

      await message.reply(`📤 Enviando ${parts.length} partes na DM...`);

      for (let i = 0; i < parts.length; i++) {
        await dm.send({
          content: `📦 Parte ${i + 1}/${parts.length}`,
          files: [parts[i]]
        });

        await new Promise(res => setTimeout(res, 1200));
      }

      message.reply("✅ Backup enviado na DM!");
    } catch (err) {
      console.log("❌ ERRO DM:", err.message);
      message.reply("❌ Não consegui enviar na DM!");
    }
  }

  if (message.content === "!restore") {
    await message.reply("♻️ Restaurando servidor...");
    await restoreServer(message.guild);
    message.reply("✅ Restore concluído!");
  }

  if (message.content === "!nuke") {
    await message.reply("💣 Backup + nuke...");
    await nukeComBackup(message.guild);
    message.reply("🔥 Servidor nukado com backup!");
  }
});

client.login(process.env.TOKEN);
