const { 
  EmbedBuilder, 
  AuditLogEvent, 
  PermissionFlagsBits,
  Colors,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

const fs = require("fs");
const express = require("express");

module.exports = (client) => {

class LoggerPro {
  constructor() {
    this.STATIC_LOGS = {
      "1403143110694932570": "1484934763939631165",
      "1484725561002561597": "1484936001947308163"
    };

    this.COLORS = {
      success: 0x22c55e,
      error: 0xef4444,
      warning: 0xf59e0b,
      info: 0x3b82f6,
      voice: 0x8b5cf6
    };

    this.cooldowns = new Map();
    this.logChannels = new Map();
    this.customLogs = new Map();
    this.stats = new Map();
    this.whitelist = new Set();

    this.init();
  }

  init() {
    this.loadCustomLogs();
    console.log("✅ Logger PRO carregado");
  }

  loadCustomLogs() {
    if (fs.existsSync("./logs.json")) {
      const data = JSON.parse(fs.readFileSync("./logs.json"));
      Object.entries(data).forEach(([g, c]) => {
        this.customLogs.set(g, c);
      });
    }
  }

  saveCustomLogs() {
    fs.writeFileSync("./logs.json", JSON.stringify(
      Object.fromEntries(this.customLogs), null, 2
    ));
  }

  getLogChannel(guildId) {
    let channelId = this.STATIC_LOGS[guildId] || this.customLogs.get(guildId);
    if (!channelId) return null;

    const guild = client.guilds.cache.get(guildId);
    if (!guild) return null;

    return guild.channels.cache.get(channelId);
  }

  async sendLog(guildId, embed, components = null) {
    const channel = this.getLogChannel(guildId);
    if (!channel) return;

    const stats = this.stats.get(guildId) || { total: 0 };
    stats.total++;
    this.stats.set(guildId, stats);

    channel.send({
      embeds: [embed],
      components: components ? [components] : []
    }).catch(() => {});
  }
}

const logger = new LoggerPro();

client.on("voiceStateUpdate", async (oldState, newState) => {
  const userId = newState.id;
  const guild = newState.guild;
  const member = newState.member;
  if (!member) return;

  if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
    const embed = new EmbedBuilder()
      .setColor(0x8b5cf6)
      .setTitle("🎵 Moveu canal")
      .addFields(
        { name: "User", value: `<@${userId}>` },
        { name: "De", value: oldState.channel?.name || "?" },
        { name: "Para", value: newState.channel?.name || "?" }
      );

    logger.sendLog(guild.id, embed);
  }

  if (!oldState.channelId && newState.channelId) {
    const embed = new EmbedBuilder()
      .setColor(0x22c55e)
      .setTitle("Entrou na call")
      .addFields({ name: "User", value: `<@${userId}>` });

    logger.sendLog(guild.id, embed);
  }

  if (oldState.channelId && !newState.channelId) {
    const embed = new EmbedBuilder()
      .setColor(0xf59e0b)
      .setTitle("Saiu da call")
      .addFields({ name: "User", value: `<@${userId}>` });

    logger.sendLog(guild.id, embed);
  }
});

client.on("guildBanAdd", async (ban) => {
  const embed = new EmbedBuilder()
    .setColor(0xef4444)
    .setTitle("🔨 Ban")
    .addFields({ name: "User", value: `<@${ban.user.id}>` });

  logger.sendLog(ban.guild.id, embed);
});

client.on("guildBanRemove", async (ban) => {
  const embed = new EmbedBuilder()
    .setColor(0x22c55e)
    .setTitle("🔓 Unban")
    .addFields({ name: "User", value: `<@${ban.user.id}>` });

  logger.sendLog(ban.guild.id, embed);
});

client.on("guildMemberUpdate", async (oldMember, newMember) => {
  if (oldMember.nickname !== newMember.nickname) {
    const embed = new EmbedBuilder()
      .setColor(0x3b82f6)
      .setTitle("✏️ Nick alterado")
      .addFields(
        { name: "User", value: `<@${newMember.id}>`, inline: true },
        { name: "Antes", value: oldMember.nickname || "Nenhum", inline: true },
        { name: "Depois", value: newMember.nickname || "Nenhum", inline: true }
      );

    logger.sendLog(newMember.guild.id, embed);
  }

  const addedRoles = newMember.roles.cache.filter(r => !oldMember.roles.cache.has(r.id) && r.id !== newMember.guild.id);
  const removedRoles = oldMember.roles.cache.filter(r => !newMember.roles.cache.has(r.id) && r.id !== newMember.guild.id);

  if (addedRoles.size > 0) {
    const embed = new EmbedBuilder()
      .setColor(0x22c55e)
      .setTitle("Cargo adicionado")
      .addFields(
        { name: "User", value: `<@${newMember.id}>` },
        { name: "Cargos", value: addedRoles.map(r => `<@&${r.id}>`).join(", ") }
      );

    logger.sendLog(newMember.guild.id, embed);
  }

  if (removedRoles.size > 0) {
    const embed = new EmbedBuilder()
      .setColor(0xef4444)
      .setTitle("Cargo removido")
      .addFields(
        { name: "User", value: `<@${newMember.id}>` },
        { name: "Cargos", value: removedRoles.map(r => `<@&${r.id}>`).join(", ") }
      );

    logger.sendLog(newMember.guild.id, embed);
  }
});

client.on("guildMemberAdd", async (member) => {
  const embed = new EmbedBuilder()
    .setColor(0x22c55e)
    .setTitle("👋 Entrou")
    .addFields(
      { name: "User", value: `<@${member.id}>` },
      { name: "Total", value: member.guild.memberCount.toString() }
    );

  logger.sendLog(member.guild.id, embed);
});

client.on("guildMemberRemove", async (member) => {
  const embed = new EmbedBuilder()
    .setColor(0xef4444)
    .setTitle("👋 Saiu")
    .addFields(
      { name: "User", value: `<@${member.id}>` },
      { name: "Total", value: member.guild.memberCount.toString() }
    );

  logger.sendLog(member.guild.id, embed);
});

client.on("messageCreate", async (message) => {
  if (!message.content.startsWith("!") || message.author.bot) return;

  const args = message.content.slice(1).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  if (command === "logset" && message.member.permissions.has(PermissionFlagsBits.Administrator)) {
    const channel = message.mentions.channels.first();
    if (!channel) return message.reply("❌ use !logset #canal");

    logger.customLogs.set(message.guild.id, channel.id);
    logger.saveCustomLogs();
    return message.reply("✅ Logs configurados");
  }

  if (command === "logremove" && message.member.permissions.has(PermissionFlagsBits.Administrator)) {
    logger.customLogs.delete(message.guild.id);
    logger.saveCustomLogs();
    return message.reply("🗑️ removido");
  }

  if (command === "logstats") {
    const stats = logger.stats.get(message.guild.id) || { total: 0 };

    const embed = new EmbedBuilder()
      .setTitle("📊 Stats")
      .setColor(Colors.Blue)
      .addFields(
        { name: "Total logs", value: stats.total.toString(), inline: true },
        { name: "Servidor", value: message.guild.name, inline: true }
      );

    return message.reply({ embeds: [embed] });
  }
});

client.on("messageDelete", async (msg) => {
  if (!msg.guild || msg.author?.bot) return;
  if (logger.whitelist.has(msg.author.id)) return;

  const embed = new EmbedBuilder()
    .setColor(0xef4444)
    .setTitle("🗑️ Mensagem deletada")
    .addFields(
      { name: "User", value: `<@${msg.author.id}>` },
      { name: "Canal", value: `<#${msg.channel.id}>` },
      { name: "Conteúdo", value: msg.content || "vazio" }
    );

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel("Perfil")
      .setStyle(ButtonStyle.Link)
      .setURL(`https://discord.com/users/${msg.author.id}`)
  );

  logger.sendLog(msg.guild.id, embed, row);
});

client.on("messageUpdate", async (oldMsg, newMsg) => {
  if (!oldMsg.guild || oldMsg.author?.bot) return;
  if (logger.whitelist.has(oldMsg.author.id)) return;
  if (oldMsg.content === newMsg.content) return;

  const embed = new EmbedBuilder()
    .setColor(0xf59e0b)
    .setTitle("✏️ Editada")
    .addFields(
      { name: "User", value: `<@${oldMsg.author.id}>` },
      { name: "Antes", value: oldMsg.content || "vazio" },
      { name: "Depois", value: newMsg.content || "vazio" }
    );

  logger.sendLog(oldMsg.guild.id, embed);
});

client.on("channelCreate", async (channel) => {
  const embed = new EmbedBuilder()
    .setColor(0x22c55e)
    .setTitle("📁 Canal criado")
    .addFields(
      { name: "Nome", value: channel.name, inline: true },
      { name: "ID", value: channel.id, inline: true }
    );

  logger.sendLog(channel.guild.id, embed);
});

client.on("channelDelete", async (channel) => {
  const embed = new EmbedBuilder()
    .setColor(0xef4444)
    .setTitle("🗑️ Canal deletado")
    .addFields(
      { name: "Nome", value: channel.name, inline: true },
      { name: "ID", value: channel.id, inline: true }
    );

  logger.sendLog(channel.guild.id, embed);
});

client.on("channelUpdate", async (oldCh, newCh) => {
  if (oldCh.name === newCh.name) return;

  const embed = new EmbedBuilder()
    .setColor(0xf59e0b)
    .setTitle("✏️ Canal atualizado")
    .addFields(
      { name: "Antes", value: oldCh.name, inline: true },
      { name: "Depois", value: newCh.name, inline: true }
    );

  logger.sendLog(newCh.guild.id, embed);
});

client.on("roleCreate", async (role) => {
  const embed = new EmbedBuilder()
    .setColor(0x22c55e)
    .setTitle("🎖️ Cargo criado")
    .addFields({ name: "Nome", value: role.name });

  logger.sendLog(role.guild.id, embed);
});

client.on("roleDelete", async (role) => {
  const embed = new EmbedBuilder()
    .setColor(0xef4444)
    .setTitle("🎖️ Cargo deletado")
    .addFields({ name: "Nome", value: role.name });

  logger.sendLog(role.guild.id, embed);
});

client.on("roleUpdate", async (oldRole, newRole) => {
  if (oldRole.name === newRole.name) return;

  const embed = new EmbedBuilder()
    .setColor(0xf59e0b)
    .setTitle("✏️ Cargo atualizado")
    .addFields(
      { name: "Antes", value: oldRole.name, inline: true },
      { name: "Depois", value: newRole.name, inline: true }
    );

  logger.sendLog(newRole.guild.id, embed);
});

const spamMap = new Map();

client.on("messageCreate", async (msg) => {
  if (!msg.guild || msg.author.bot) return;

  const data = spamMap.get(msg.author.id) || { count: 0 };
  data.count++;
  spamMap.set(msg.author.id, data);

  setTimeout(() => data.count--, 5000);

  if (data.count >= 6) {
    msg.delete().catch(() => {});

    const embed = new EmbedBuilder()
      .setColor(0xef4444)
      .setTitle("🚫 Spam detectado")
      .addFields({ name: "User", value: `<@${msg.author.id}>` });

    logger.sendLog(msg.guild.id, embed);
  }
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "logset") {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) return;
    const channel = interaction.options.getChannel("canal");
    logger.customLogs.set(interaction.guild.id, channel.id);
    logger.saveCustomLogs();
    return interaction.reply({ content: "✅ setado", ephemeral: true });
  }

  if (interaction.commandName === "logremove") {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) return;
    logger.customLogs.delete(interaction.guild.id);
    logger.saveCustomLogs();
    return interaction.reply({ content: "🗑️ removido", ephemeral: true });
  }

  if (interaction.commandName === "whitelist") {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) return;
    const user = interaction.options.getUser("usuario");
    logger.whitelist.add(user.id);
    return interaction.reply({ content: "✅ add", ephemeral: true });
  }
});

const app = express();

app.get("/", (req, res) => {
  res.send({
    status: "online",
    servers: client.guilds.cache.size,
    users: client.users.cache.size
  });
});

app.listen(3000);

};
