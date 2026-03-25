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
      voice: 0x8b5cf6,
      premium: 0x5865F2
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
    console.log("🚀 Logger PRO ULTRA carregado");
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

  async getExecutor(guild, type, targetId) {
    try {
      const logs = await guild.fetchAuditLogs({ limit: 5, type });
      const entry = logs.entries.find(e => e.target?.id === targetId);
      return entry?.executor || null;
    } catch {
      return null;
    }
  }

  
  createEmbed({
    title,
    color,
    user,
    executor,
    reason,
    fields = [],
    footerExtra = ""
  }) {
    const embed = new EmbedBuilder()
      .setColor(color || this.COLORS.premium)
      .setTitle(title)
      .setTimestamp();

    if (user) {
      embed
        .setAuthor({
          name: `${user.tag}`,
          iconURL: user.displayAvatarURL({ dynamic: true })
        })
        .setThumbnail(user.displayAvatarURL({ dynamic: true }))
        .addFields(
          { name: "👤 Usuário", value: `<@${user.id}>`, inline: true },
          { name: "🆔 ID", value: `\`${user.id}\``, inline: true },
          { name: "📛 Tag", value: `\`${user.tag}\``, inline: true }
        );
    }

    if (executor) {
      embed.addFields({
        name: "🛠️ Executor",
        value: `<@${executor.id}> (\`${executor.tag}\`)`,
        inline: false
      });
    }

    if (reason) {
      embed.addFields({
        name: "📄 Motivo",
        value: reason,
        inline: false
      });
    }

    if (fields.length > 0) embed.addFields(fields);

    embed.setFooter({
      text: `Logger PRO ULTRA ${footerExtra}`
    });

    return embed;
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
  const member = newState.member;
  if (!member) return;

  const guild = newState.guild;

  const getExecutor = async (type) => {
    try {
      const logs = await guild.fetchAuditLogs({ limit: 5, type });
      const entry = logs.entries.find(e =>
        e.target?.id === member.id &&
        Date.now() - e.createdTimestamp < 5000
      );
      return entry?.executor || null;
    } catch {
      return null;
    }
  };

  // 🔥 FOI PUXADO
  if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
    const executor = await getExecutor(AuditLogEvent.MemberMove);

    const embed = new EmbedBuilder()
      .setColor(0x8b5cf6)
      .setTitle("🎯 Movimento de Voz")
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
      .setDescription(
        executor
          ? `👑 <@${executor.id}> puxou **${member.user.tag}**`
          : `🔊 ${member.user.tag} mudou de canal sozinho`
      )
      .addFields(
        { name: "👤 Usuário", value: `<@${member.id}>`, inline: true },
        { name: "🆔 ID", value: member.id, inline: true },
        { name: "📤 Saiu de", value: oldState.channel?.toString(), inline: true },
        { name: "📥 Entrou em", value: newState.channel?.toString(), inline: true }
      )
      .setTimestamp();

    return logger.sendLog(guild.id, embed);
  }

  // 🔥 ENTROU
  if (!oldState.channelId && newState.channelId) {
    const embed = new EmbedBuilder()
      .setColor(0x22c55e)
      .setTitle("🎧 Entrou na call")
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
      .setDescription(`🔥 **${member.user.tag} entrou sozinho**`)
      .addFields(
        { name: "👤 Usuário", value: `<@${member.id}>`, inline: true },
        { name: "🆔 ID", value: member.id, inline: true },
        { name: "📢 Canal", value: newState.channel.toString(), inline: true }
      )
      .setTimestamp();

    return logger.sendLog(guild.id, embed);
  }

  // 🔥 SAIU
  if (oldState.channelId && !newState.channelId) {
    const embed = new EmbedBuilder()
      .setColor(0xf59e0b)
      .setTitle("📤 Saiu da call")
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
      .setDescription(`😴 **${member.user.tag} saiu da call**`)
      .addFields(
        { name: "👤 Usuário", value: `<@${member.id}>`, inline: true },
        { name: "🆔 ID", value: member.id, inline: true }
      )
      .setTimestamp();

    return logger.sendLog(guild.id, embed);
  }
});




client.on("guildBanAdd", async (ban) => {
  const guild = ban.guild;
  const user = ban.user;

  const executor = await logger.getExecutor(guild, AuditLogEvent.MemberBanAdd, user.id);

  const logs = await guild.fetchAuditLogs({ type: AuditLogEvent.MemberBanAdd, limit: 1 });
  const reason = logs.entries.first()?.reason || "Não especificado";

  const embed = logger.createEmbed({
    title: "🔨 Usuário Banido",
    color: logger.COLORS.error,
    user,
    executor,
    reason
  });

  logger.sendLog(guild.id, embed);
});


client.on("guildBanRemove", async (ban) => {
  const guild = ban.guild;
  const user = ban.user;

  const executor = await logger.getExecutor(guild, AuditLogEvent.MemberBanRemove, user.id);

  const embed = logger.createEmbed({
    title: "🔓 Ban Removido",
    color: logger.COLORS.success,
    user,
    executor
  });

  logger.sendLog(guild.id, embed);
});




client.on("guildMemberUpdate", async (oldMember, newMember) => {
  const guild = newMember.guild;
  const user = newMember.user;

  // NICK
  if (oldMember.nickname !== newMember.nickname) {
    const embed = logger.createEmbed({
      title: "✏️ Nick alterado",
      color: logger.COLORS.info,
      user,
      fields: [
        { name: "Antes", value: oldMember.nickname || "Nenhum", inline: true },
        { name: "Depois", value: newMember.nickname || "Nenhum", inline: true }
      ]
    });

    logger.sendLog(guild.id, embed);
  }

  
  const addedRoles = newMember.roles.cache.filter(r => 
    !oldMember.roles.cache.has(r.id) && r.id !== guild.id
  );

  const removedRoles = oldMember.roles.cache.filter(r => 
    !newMember.roles.cache.has(r.id) && r.id !== guild.id
  );

  if (addedRoles.size > 0) {
    const executor = await logger.getExecutor(guild, AuditLogEvent.MemberRoleUpdate, user.id);

    const embed = logger.createEmbed({
      title: "🟢 Cargo Adicionado",
      color: logger.COLORS.success,
      user,
      executor,
      fields: [
        { name: "Cargos", value: addedRoles.map(r => `<@&${r.id}>`).join(", ") }
      ]
    });

    logger.sendLog(guild.id, embed);
  }

  if (removedRoles.size > 0) {
    const executor = await logger.getExecutor(guild, AuditLogEvent.MemberRoleUpdate, user.id);

    const embed = logger.createEmbed({
      title: "🔴 Cargo Removido",
      color: logger.COLORS.error,
      user,
      executor,
      fields: [
        { name: "Cargos", value: removedRoles.map(r => `<@&${r.id}>`).join(", ") }
      ]
    });

    logger.sendLog(guild.id, embed);
  }
});




client.on("guildMemberAdd", async (member) => {
  const user = member.user;

  const embed = logger.createEmbed({
    title: "👋 Novo Membro",
    color: logger.COLORS.success,
    user,
    fields: [
      { name: "📊 Total", value: `${member.guild.memberCount}`, inline: true }
    ]
  });

  logger.sendLog(member.guild.id, embed);
});


client.on("guildMemberRemove", async (member) => {
  const user = member.user;

  const embed = logger.createEmbed({
    title: "🚪 Membro Saiu",
    color: logger.COLORS.error,
    user,
    fields: [
      { name: "📊 Total", value: `${member.guild.memberCount}`, inline: true }
    ]
  });

  logger.sendLog(member.guild.id, embed);
});



client.on("messageDelete", async (msg) => {
  if (!msg.guild || msg.author?.bot) return;
  if (logger.whitelist.has(msg.author.id)) return;

  const user = msg.author;

  const embed = logger.createEmbed({
    title: "🗑️ Mensagem Deletada",
    color: logger.COLORS.error,
    user,
    fields: [
      { name: "📍 Canal", value: `<#${msg.channel.id}>`, inline: true },
      { name: "💬 Conteúdo", value: msg.content?.slice(0, 1000) || "Sem conteúdo" }
    ]
  });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel("Ver Perfil")
      .setStyle(ButtonStyle.Link)
      .setURL(`https://discord.com/users/${user.id}`)
  );

  logger.sendLog(msg.guild.id, embed, row);
});




client.on("messageUpdate", async (oldMsg, newMsg) => {
  if (!oldMsg.guild || oldMsg.author?.bot) return;
  if (logger.whitelist.has(oldMsg.author.id)) return;
  if (oldMsg.content === newMsg.content) return;

  const user = oldMsg.author;

  const embed = logger.createEmbed({
    title: "✏️ Mensagem Editada",
    color: logger.COLORS.warning,
    user,
    fields: [
      { name: "📍 Canal", value: `<#${oldMsg.channel.id}>` },
      { name: "Antes", value: oldMsg.content?.slice(0, 1000) || "Sem conteúdo" },
      { name: "Depois", value: newMsg.content?.slice(0, 1000) || "Sem conteúdo" }
    ]
  });

  logger.sendLog(oldMsg.guild.id, embed);
});




client.on("channelCreate", async (channel) => {
  const embed = new EmbedBuilder()
    .setColor(logger.COLORS.success)
    .setTitle("📁 Canal Criado")
    .addFields(
      { name: "📌 Nome", value: channel.name, inline: true },
      { name: "🆔 ID", value: `\`${channel.id}\``, inline: true }
    )
    .setTimestamp();

  logger.sendLog(channel.guild.id, embed);
});


client.on("channelDelete", async (channel) => {
  const embed = new EmbedBuilder()
    .setColor(logger.COLORS.error)
    .setTitle("🗑️ Canal Deletado")
    .addFields(
      { name: "📌 Nome", value: channel.name, inline: true },
      { name: "🆔 ID", value: `\`${channel.id}\``, inline: true }
    )
    .setTimestamp();

  logger.sendLog(channel.guild.id, embed);
});


client.on("channelUpdate", async (oldCh, newCh) => {
  if (oldCh.name === newCh.name) return;

  const embed = new EmbedBuilder()
    .setColor(logger.COLORS.warning)
    .setTitle("✏️ Canal Atualizado")
    .addFields(
      { name: "Antes", value: oldCh.name, inline: true },
      { name: "Depois", value: newCh.name, inline: true }
    )
    .setTimestamp();

  logger.sendLog(newCh.guild.id, embed);
});




client.on("roleCreate", async (role) => {
  const embed = new EmbedBuilder()
    .setColor(logger.COLORS.success)
    .setTitle("🎖️ Cargo Criado")
    .addFields({ name: "Nome", value: role.name });

  logger.sendLog(role.guild.id, embed);
});


client.on("roleDelete", async (role) => {
  const embed = new EmbedBuilder()
    .setColor(logger.COLORS.error)
    .setTitle("🎖️ Cargo Deletado")
    .addFields({ name: "Nome", value: role.name });

  logger.sendLog(role.guild.id, embed);
});


client.on("roleUpdate", async (oldRole, newRole) => {
  if (oldRole.name === newRole.name) return;

  const embed = new EmbedBuilder()
    .setColor(logger.COLORS.warning)
    .setTitle("✏️ Cargo Atualizado")
    .addFields(
      { name: "Antes", value: oldRole.name, inline: true },
      { name: "Depois", value: newRole.name, inline: true }
    );

  logger.sendLog(newRole.guild.id, embed);
});




const spamMap = new Map();

client.on("messageCreate", async (msg) => {
  if (!msg.guild || msg.author.bot) return;

  const userId = msg.author.id;

  const data = spamMap.get(userId) || {
    count: 0,
    last: Date.now()
  };

  data.count++;
  data.last = Date.now();
  spamMap.set(userId, data);

  setTimeout(() => {
    data.count--;
  }, 4000);

  if (data.count >= 6) {
    msg.delete().catch(() => {});

    const embed = logger.createEmbed({
      title: "🚫 Spam Detectado",
      color: logger.COLORS.error,
      user: msg.author,
      fields: [
        { name: "📍 Canal", value: `<#${msg.channel.id}>` },
        { name: "⚠️ Ação", value: "Mensagem removida automaticamente" }
      ]
    });

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

    return interaction.reply({
      content: "✅ Canal de logs configurado com sucesso!",
      ephemeral: true
    });
  }

  if (interaction.commandName === "logremove") {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) return;

    logger.customLogs.delete(interaction.guild.id);
    logger.saveCustomLogs();

    return interaction.reply({
      content: "🗑️ Sistema de logs removido!",
      ephemeral: true
    });
  }

  if (interaction.commandName === "whitelist") {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) return;

    const user = interaction.options.getUser("usuario");
    logger.whitelist.add(user.id);

    return interaction.reply({
      content: `✅ ${user.tag} foi adicionado à whitelist`,
      ephemeral: true
    });
  }
});




const app = express();

app.get("/", (req, res) => {
  res.send({
    status: "online",
    servers: client.guilds.cache.size,
    users: client.users.cache.size,
    version: "ULTRA PRO"
  });
});

app.listen(3000);
}
