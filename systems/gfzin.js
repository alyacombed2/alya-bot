const { 
  EmbedBuilder, 
  AuditLogEvent, 
  Colors,
  PermissionFlagsBits 
} = require("discord.js");
const { QuickDB } = require("quick.db");

module.exports = (client) => {
  const db = new QuickDB({ filePath: "./logs.db" });
  
  const STATIC_LOGS = {
    "1403143110694932570": "1484934763939631165",
    "1484725561002561597": "1484936001947308163"
  };
  
  const COLORS = {
    success: 0x22c55e,
    error: 0xef4444,
    warning: 0xf59e0b,
    info: 0x3b82f6,
    voice: 0x8b5cf6,
    moderation: 0x7c3aed,
    system: 0x6b7280
  };

  const cooldowns = new Map();
  const logChannels = new Map();

  const getLogChannel = async (guildId) => {
    if (logChannels.has(guildId)) {
      const cached = logChannels.get(guildId);
      const channel = cached.guild.channels.cache.get(cached.channelId);
      if (channel) return channel;
      logChannels.delete(guildId);
    }

    let channelId = STATIC_LOGS[guildId];
    
    if (!channelId) {
      channelId = await db.get(`logs.${guildId}`) || null;
    }
    
    if (!channelId) return null;

    const guild = client.guilds.cache.get(guildId);
    if (!guild) return null;

    const channel = guild.channels.cache.get(channelId);
    if (channel) {
      logChannels.set(guildId, { channelId, guild });
      return channel;
    }
    return null;
  };

  const getExecutor = async (guild, type, targetId, timestamp = Date.now()) => {
    try {
      const cacheKey = `${guild.id}-${type}-${targetId}`;
      const cached = cooldowns.get(cacheKey);
      if (cached && timestamp - cached.time < 10000) {
        return cached.executor;
      }

      const logs = await guild.fetchAuditLogs({ 
        limit: 5, 
        type,
        before: new Date(timestamp)
      });

      const entry = logs.entries.find(e => 
        e.target?.id === targetId &&
        timestamp - e.createdTimestamp < 10000 &&
        !e.changes.some(change => change.key === "communication_disabled_until")
      );

      const executor = entry?.executor || null;
      
      cooldowns.set(cacheKey, { executor, time: timestamp });
      setTimeout(() => cooldowns.delete(cacheKey), 30000);
      
      return executor;
    } catch {
      return null;
    }
  };

  const createProfessionalEmbed = (type, data) => {
    const embed = new EmbedBuilder()
      .setTimestamp()
      .setFooter({ 
        text: `ID: ${data.targetId} | Logs Profissional v2.0`,
        iconURL: client.user.displayAvatarURL()
      });

    switch (type) {
      case 'voiceMove':
        embed.setColor(COLORS.voice)
             .setTitle('🎵 Movimento de Voz')
             .setThumbnail(data.memberAvatar)
             .setAuthor({ 
               name: data.memberName, 
               iconURL: data.memberAvatar,
               url: `https://discord.com/users/${data.targetId}`
             })
             .addFields(
               { name: '👤 Membro', value: data.memberMention, inline: true },
               { name: '🔧 Por', value: data.executor || '🤖 Sistema', prior: true },
               { name: '📤 De', value: data.fromChannel, inline: true },
               { name: '📥 Para', value: data.toChannel, inline: true },
               { name: '⏱️ Duração', value: data.duration || 'N/A', inline: true }
             );
        break;

      case 'voiceJoin':
        embed.setColor(COLORS.success)
             .setTitle('🎧 Entrou no Canal de Voz')
             .setThumbnail(data.memberAvatar)
             .setAuthor({ 
               name: data.memberName, 
               iconURL: data.memberAvatar,
               url: `https://discord.com/users/${data.targetId}`
             })
             .addFields(
               { name: '👤 Membro', value: data.memberMention, inline: true },
               { name: '📢 Canal', value: data.channelMention, inline: true }
             );
        break;

      case 'voiceLeave':
        embed.setColor(COLORS.warning)
             .setTitle('🔇 Saiu do Canal de Voz')
             .setThumbnail(data.memberAvatar)
             .setAuthor({ 
               name: data.memberName, 
               iconURL: data.memberAvatar,
               url: `https://discord.com/users/${data.targetId}`
             })
             .addFields(
               { name: '👤 Membro', value: data.memberMention, inline: true },
               { name: '📢 Canal', value: data.channelMention, inline: true },
               { name: '⏱️ Tempo na call', value: data.duration || 'N/A', inline: true }
             );
        break;

      case 'banAdd':
        embed.setColor(COLORS.error)
             .setTitle('🔨 Membro Banido')
             .setThumbnail(data.userAvatar)
             .setAuthor({ 
               name: data.targetName, 
               iconURL: data.userAvatar
             })
             .addFields(
               { name: '👤 Membro', value: data.targetMention, inline: true },
               { name: '🔧 Por', value: data.executor || 'Desconhecido', inline: true },
               { name: '📝 Motivo', value: data.reason || 'Não especificado', inline: false }
             );
        break;

      case 'banRemove':
        embed.setColor(COLORS.success)
             .setTitle('🔓 Ban Revogado')
             .setThumbnail(data.userAvatar)
             .setAuthor({ 
               name: data.targetName, 
               iconURL: data.userAvatar
             })
             .addFields(
               { name: '👤 Membro', value: data.targetMention, inline: true },
               { name: '🔧 Por', value: data.executor || 'Desconhecido', inline: true }
             );
        break;

      case 'nickname':
        embed.setColor(COLORS.info)
             .setTitle('✏️ Apelido Alterado')
             .setThumbnail(data.memberAvatar)
             .setAuthor({ 
               name: data.memberName, 
               iconURL: data.memberAvatar
             })
             .addFields(
               { name: 'Antes', value: `\`${data.oldNick || 'Nenhum'}\``, inline: true },
               { name: 'Depois', value: `\`${data.newNick || 'Nenhum'}\``, inline: true }
             );
        break;

      case 'roleAdd':
        embed.setColor(COLORS.success)
             .setTitle('🎖️ Cargo Adicionado')
             .setThumbnail(data.memberAvatar)
             .setAuthor({ 
               name: data.memberName, 
               iconURL: data.memberAvatar
             })
             .addFields(
               { name: '👤 Membro', value: data.memberMention, inline: true },
               { name: '📝 Cargos', value: data.roles.join(', '), inline: false }
             );
        break;

      case 'roleRemove':
        embed.setColor(COLORS.error)
             .setTitle('🎖️ Cargo Removido')
             .setThumbnail(data.memberAvatar)
             .setAuthor({ 
               name: data.memberName, 
               iconURL: data.memberAvatar
             })
             .addFields(
               { name: '👤 Membro', value: data.memberMention, inline: true },
               { name: '📝 Cargos', value: data.roles.join(', '), inline: false }
             );
        break;
    }

    return embed;
  };

  client.on("voiceStateUpdate", async (oldState, newState) => {
    const userId = newState.id;
    const now = Date.now();

    const userCooldown = cooldowns.get(`voice-${userId}`);
    if (userCooldown && now - userCooldown < 1500) return;
    cooldowns.set(`voice-${userId}`, now);

    const guild = newState.guild;
    const member = newState.member;
    if (!member) return;

    const channel = await getLogChannel(guild.id);
    if (!channel) return;

    if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
      const executor = await getExecutor(guild, AuditLogEvent.MemberMove, userId);
      
      const embed = createProfessionalEmbed('voiceMove', {
        targetId: userId,
        memberName: member.user.tag,
        memberMention: member.toString(),
        memberAvatar: member.user.displayAvatarURL({ dynamic: true }),
        executor: executor ? `<@${executor.id}>` : null,
        fromChannel: oldState.channel?.name || 'Desconhecido',
        toChannel: newState.channel?.name || 'Desconhecido'
      });

      return channel.send({ embeds: [embed] }).catch(() => {});
    }

    if (!oldState.channelId && newState.channelId) {
      const embed = createProfessionalEmbed('voiceJoin', {
        targetId: userId,
        memberName: member.user.tag,
        memberMention: member.toString(),
        memberAvatar: member.user.displayAvatarURL({ dynamic: true }),
        channelMention: newState.channel.toString()
      });

      return channel.send({ embeds: [embed] }).catch(() => {});
    }

    if (oldState.channelId && !newState.channelId) {
      const duration = new Date(now - (oldState.channel?.joinAt || 0)).toISOString().slice(11, 19);
      
      const embed = createProfessionalEmbed('voiceLeave', {
        targetId: userId,
        memberName: member.user.tag,
        memberMention: member.toString(),
        memberAvatar: member.user.displayAvatarURL({ dynamic: true }),
        channelMention: oldState.channel?.toString() || 'Desconhecido',
        duration
      });

      return channel.send({ embeds: [embed] }).catch(() => {});
    }
  });

  client.on("guildBanAdd", async (ban) => {
    const guild = ban.guild;
    const channel = await getLogChannel(guild.id);
    if (!channel) return;

    const executor = await getExecutor(guild, AuditLogEvent.MemberBanAdd, ban.user.id);
    const auditLogs = await guild.fetchAuditLogs({ type: AuditLogEvent.MemberBanAdd, limit: 1 });
    const entry = auditLogs.entries.first();
    const reason = entry?.reason || 'Não especificado';

    const embed = createProfessionalEmbed('banAdd', {
      targetId: ban.user.id,
      targetName: ban.user.tag,
      targetMention: `<@${ban.user.id}>`,
      userAvatar: ban.user.displayAvatarURL({ dynamic: true }),
      executor: executor ? `<@${executor.id}>` : 'Desconhecido',
      reason
    });

    channel.send({ embeds: [embed] }).catch(() => {});
  });

  client.on("guildBanRemove", async (ban) => {
    const guild = ban.guild;
    const channel = await getLogChannel(guild.id);
    if (!channel) return;

    const executor = await getExecutor(guild, AuditLogEvent.MemberBanRemove, ban.user.id);

    const embed = createProfessionalEmbed('banRemove', {
      targetId: ban.user.id,
      targetName: ban.user.tag,
      targetMention: `<@${ban.user.id}>`,
      userAvatar: ban.user.displayAvatarURL({ dynamic: true }),
      executor: executor ? `<@${executor.id}>` : 'Desconhecido'
    });

    channel.send({ embeds: [embed] }).catch(() => {});
  });

  client.on("guildMemberUpdate", async (oldMember, newMember) => {
    const guild = newMember.guild;
    const channel = await getLogChannel(guild.id);
    if (!channel) return;

    if (oldMember.nickname !== newMember.nickname) {
      const embed = createProfessionalEmbed('nickname', {
        targetId: newMember.id,
        memberName: newMember.user.tag,
        memberAvatar: newMember.user.displayAvatarURL({ dynamic: true }),
        oldNick: oldMember.nickname,
        newNick: newMember.nickname
      });
      channel.send({ embeds: [embed] }).catch(() => {});
    }

    const addedRoles = newMember.roles.cache.filter(r => 
      !oldMember.roles.cache.has(r.id) && 
      r.id !== guild.id
    );
    
    const removedRoles = oldMember.roles.cache.filter(r => 
      !newMember.roles.cache.has(r.id) && 
      r.id !== guild.id
    );

    if (addedRoles.size > 0) {
      const embed = createProfessionalEmbed('roleAdd', {
        targetId: newMember.id,
        memberName: newMember.user.tag,
        memberMention: newMember.toString(),
        memberAvatar: newMember.user.displayAvatarURL({ dynamic: true }),
        roles: addedRoles.map(r => `<@&${r.id}>`).array()
      });
      channel.send({ embeds: [embed] }).catch(() => {});
    }

    if (removedRoles.size > 0) {
      const embed = createProfessionalEmbed('roleRemove', {
        targetId: newMember.id,
        memberName: newMember.user.tag,
        memberMention: newMember.toString(),
        memberAvatar: newMember.user.displayAvatarURL({ dynamic: true }),
        roles: removedRoles.map(r => `<@&${r.id}>`).array()
      });
      channel.send({ embeds: [embed] }).catch(() => {});
    }
  });

  client.on('messageCreate', async (message) => {
    if (!message.content.startsWith('!') || message.author.bot) return;

    const args = message.content.slice(1).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    if (command === 'logset') {
      if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return message.reply('❌ Sem permissão!');
      }

      const channel = message.mentions.channels.first() || message.channel;
      await db.set(`logs.${message.guild.id}`, channel.id);
      logChannels.delete(message.guild.id);
      
      message.reply(`✅ Logs configurados para ${channel}!`);
    }

    if (command === 'logremove') {
      if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return message.reply('❌ Sem permissão!');
      }

      await db.delete(`logs.${message.guild.id}`);
      logChannels.delete(message.guild.id);
      message.reply('🗑️ Logs removidos!');
    }
  });
};
