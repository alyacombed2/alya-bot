const { Client, GatewayIntentBits } = require("discord.js");
const fs = require("fs");
const path = require("path");
const {
  backupServer,
  restoreServer,
  zipBackup,
  splitFile,
  nukeComBackup
} = require("./systems/backupRestore");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates
  ]
});

const OWNER_ID = "1372615579407618209";
const BACKUP_CHANNEL_ID = "1479261311635554435";

require("./systems/main")(client);
require("./systems/gfzin")(client);
require("./systems/coco")(client);

client.once("clientReady", () => {
  console.log(`✅ Bot online como ${client.user.tag}`);
});

async function enviarArquivosBackup(parts, motivo = "Backup") {
  let dmEnviada = false;
  let canalEnviado = false;

  try {
    const user = await client.users.fetch(OWNER_ID);
    const dm = await user.createDM();

    await dm.send(`⚠️ ${motivo}\n📦 Enviando backup automático...`);

    for (let i = 0; i < parts.length; i++) {
      await dm.send({
        content: `📦 Parte ${i + 1}/${parts.length}`,
        files: [parts[i]]
      });

      await new Promise(res => setTimeout(res, 1500));
    }

    await dm.send("✅ Backup enviado com sucesso!");
    dmEnviada = true;
  } catch (err) {
    console.log("❌ Erro ao enviar na DM:", err.message);
  }

  try {
    const canal = await client.channels.fetch(BACKUP_CHANNEL_ID).catch(() => null);

    if (canal) {
      await canal.send(`⚠️ ${motivo}\n📦 Enviando backup automático...`);

      for (let i = 0; i < parts.length; i++) {
        await canal.send({
          content: `📦 Parte ${i + 1}/${parts.length}`,
          files: [parts[i]]
        });

        await new Promise(res => setTimeout(res, 1500));
      }

      await canal.send("✅ Backup enviado com sucesso!");
      canalEnviado = true;
    }
  } catch (err) {
    console.log("❌ Erro ao enviar no canal:", err.message);
  }

  if (!dmEnviada && !canalEnviado) {
    console.log("❌ Não consegui enviar backup nem na DM nem no canal.");
  }
}

async function limparPartesTemporarias(parts) {
  try {
    for (const file of parts) {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
      }
    }
  } catch (err) {
    console.log("⚠️ Erro ao limpar arquivos temporários:", err.message);
  }
}

async function enviarBackupAutomatico(motivo = "Encerramento") {
  try {
    const guild = client.guilds.cache.first();
    if (!guild) return;

    console.log(`📦 Backup automático iniciado (${motivo})`);

    await backupServer(guild);
    const zipPath = await zipBackup(guild.id);
    const parts = splitFile(zipPath);

    await enviarArquivosBackup(parts, `⚠️ Bot finalizado (${motivo})`);
    await limparPartesTemporarias(parts);
  } catch (err) {
    console.log("❌ Erro backup auto:", err.message);
  }
}

process.on("SIGINT", async () => {
  console.log("🛑 SIGINT detectado");
  await enviarBackupAutomatico("SIGINT");
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("🛑 SIGTERM detectado");
  await enviarBackupAutomatico("SIGTERM (Railway)");
  process.exit(0);
});

process.on("uncaughtException", async (err) => {
  console.log("💥 ERRO:", err);
  await enviarBackupAutomatico("Erro crítico");
  process.exit(1);
});

process.on("unhandledRejection", async (reason) => {
  console.log("💥 PROMISE ERROR:", reason);
  await enviarBackupAutomatico("Promise rejeitada");
});

setInterval(async () => {
  try {
    const guild = client.guilds.cache.first();
    if (!guild) return;

    console.log("💾 Backup automático periódico...");
    await backupServer(guild);
  } catch (err) {
    console.log("❌ Erro auto backup:", err.message);
  }
}, 1000 * 60 * 30);

client.on("messageCreate", async (message) => {
  if (!message.guild || message.author.bot) return;
  if (message.author.id !== OWNER_ID) return;

  if (message.content === "!backup") {
    await message.reply("📦 Fazendo backup...");

    try {
      await backupServer(message.guild);
      const zipPath = await zipBackup(message.guild.id);
      const parts = splitFile(zipPath);

      await message.reply(`📤 Enviando ${parts.length} partes na DM e no canal...`);
      await enviarArquivosBackup(parts, "📦 Backup manual solicitado");
      await limparPartesTemporarias(parts);

      await message.reply("✅ Backup enviado!");
    } catch (err) {
      console.log("❌ ERRO BACKUP MANUAL:", err.message);
      await message.reply("❌ Não consegui enviar o backup!");
    }
  }

  if (message.content === "!restore") {
    await message.reply("♻️ Restaurando servidor...");

    try {
      await restoreServer(message.guild);
      await message.reply("✅ Restore concluído!");
    } catch (err) {
      console.log("❌ ERRO RESTORE:", err.message);
      await message.reply("❌ Erro ao restaurar o servidor.");
    }
  }

  if (message.content === "!nuke") {
    await message.reply("💣 Backup + nuke...");

    try {
      await nukeComBackup(message.guild);
      await message.reply("🔥 Servidor nukado com backup!");
    } catch (err) {
      console.log("❌ ERRO NUKE:", err.message);
      await message.reply("❌ Erro ao executar o nuke.");
    }
  }
});

client.login(process.env.TOKEN);
