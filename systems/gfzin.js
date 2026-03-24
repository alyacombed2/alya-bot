const { EmbedBuilder, AuditLogEvent } = require("discord.js");

module.exports = (client) => {

  
  const LOG_CHANNELS = {
    
    "1403143110694932570": "1484934763939631165",
    "1484725561002561597": "1484936001947308163"
  };

 
  const getExecutor = async (guild, type, targetId) => {
    try {
      const logs = await guild.fetchAuditLogs({ limit: 5, type });
      const entry = logs.entries.find(e => e.target && e.target.id === targetId && Date.now() - e.createdTimestamp < 10000);
      if (entry) return entry.executor;
    } catch {}
    return null;
  };

 
  client.on("voiceStateUpdate", async (oldState, newState) => {
    const guild = newState.guild;
    const logChannelId = LOG_CHANNELS[guild.id];
    if (!logChannelId) return;
    const logChannel = guild.channels.cache.get(logChannelId);
    if (!logChannel) return;

    let executor = null;

   
    if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
      executor = await getExecutor(guild, AuditLogEvent.MemberMove, newState.id);

      const embed = new EmbedBuilder()
        .setColor("#8b5cf6")
        .setAuthor({ name: newState.member.user.tag, iconURL: newState.member.user.displayAvatarURL() })
        .setTitle("🔊 Usuário movido de canal")
        .addFields(
          { name: "👤 Usuário", value: `<@${newState.id}>`, inline: true },
          { name: "🛠️ Movido por", value: executor ? `<@${executor.id}>` : "Desconhecido", inline: true },
          { name: "📥 Canal anterior", value: `${oldState.channel?.name || "Desconhecido"}`, inline: true },
          { name: "📤 Canal atual", value: `${newState.channel?.name || "Desconhecido"}`, inline: true }
        )
        .setThumbnail(newState.member.user.displayAvatarURL())
        .setFooter({ text: `ID do usuário: ${newState.id}` })
        .setTimestamp();

      return logChannel.send({ embeds: [embed] });
    }

   
    if (!oldState.channelId && newState.channelId) {
      const embed = new EmbedBuilder()
        .setColor("#22c55e")
        .setAuthor({ name: newState.member.user.tag, iconURL: newState.member.user.displayAvatarURL() })
        .setTitle("➕ Usuário entrou na call")
        .setDescription(`👤 <@${newState.id}> entrou em **${newState.channel.name}**`)
        .setThumbnail(newState.member.user.displayAvatarURL())
        .setTimestamp();

      return logChannel.send({ embeds: [embed] });
    }

                
    if (oldState.channelId && !newState.channelId) {
      const embed = new EmbedBuilder()
        .setColor("#ef4444")
        .setAuthor({ name: newState.member.user.tag, iconURL: newState.member.user.displayAvatarURL() })
        .setTitle("➖ Usuário saiu da call")
        .setDescription(`👤 <@${newState.id}> saiu de **${oldState.channel?.name || "Desconhecido"}**`)
        .setThumbnail(newState.member.user.displayAvatarURL())
        .setTimestamp();

      return logChannel.send({ embeds: [embed] });
    }

   
    if (!oldState.serverMute && newState.serverMute) {
      executor = await getExecutor(guild, AuditLogEvent.MemberUpdate, newState.id);

      const embed = new EmbedBuilder()
        .setColor("#ef4444")
        .setAuthor({ name: newState.member.user.tag, iconURL: newState.member.user.displayAvatarURL() })
        .setTitle("🔇 Usuário mutado")
        .addFields(
          { name: "👤 Usuário", value: `<@${newState.id}>`, inline: true },
          { name: "🛠️ Mutado por", value: executor ? `<@${executor.id}>` : "Desconhecido", inline: true }
        )
        .setThumbnail(newState.member.user.displayAvatarURL())
        .setTimestamp();

      return logChannel.send({ embeds: [embed] });
    }

  
    if (oldState.serverMute && !newState.serverMute) {
      executor = await getExecutor(guild, AuditLogEvent.MemberUpdate, newState.id);

      const embed = new EmbedBuilder()
        .setColor("#22c55e")
        .setAuthor({ name: newState.member.user.tag, iconURL: newState.member.user.displayAvatarURL() })
        .setTitle("🔊 Usuário desmutado")
        .addFields(
          { name: "👤 Usuário", value: `<@${newState.id}>`, inline: true },
          { name: "🛠️ Desmutado por", value: executor ? `<@${executor.id}>` : "Desconhecido", inline: true }
        )
        .setThumbnail(newState.member.user.displayAvatarURL())
        .setTimestamp();

      return logChannel.send({ embeds: [embed] });
    }
  });

 
  client.on("guildMemberUpdate", async (oldMember, newMember) => {
    const oldTimeout = oldMember.communicationDisabledUntilTimestamp;
    const newTimeout = newMember.communicationDisabledUntilTimestamp;
    if (oldTimeout === newTimeout) return;

    const guild = newMember.guild;
    const logChannelId = LOG_CHANNELS[guild.id];
    if (!logChannelId) return;
    const logChannel = guild.channels.cache.get(logChannelId);
    if (!logChannel) return;

    let executor = await getExecutor(guild, AuditLogEvent.MemberUpdate, newMember.id);

    if (!oldTimeout && newTimeout) {
      const embed = new EmbedBuilder()
        .setColor("#f59e0b")
        .setAuthor({ name: newMember.user.tag, iconURL: newMember.user.displayAvatarURL() })
        .setTitle("⛓️ Timeout aplicado")
        .addFields(
          { name: "👤 Usuário", value: `<@${newMember.id}>`, inline: true },
          { name: "🛠️ Moderador", value: executor ? `<@${executor.id}>` : "Desconhecido", inline: true },
          { name: "⏳ Expira em", value: `<t:${Math.floor(newTimeout / 1000)}:R>`, inline: true }
        )
        .setThumbnail(newMember.user.displayAvatarURL())
        .setFooter({ text: `ID: ${newMember.id}` })
        .setTimestamp();

      return logChannel.send({ embeds: [embed] });
    }

   
    if (oldTimeout && !newTimeout) {
      const embed = new EmbedBuilder()
        .setColor("#22c55e")
        .setAuthor({ name: newMember.user.tag, iconURL: newMember.user.displayAvatarURL() })
        .setTitle("🔓 Timeout removido")
        .addFields(
          { name: "👤 Usuário", value: `<@${newMember.id}>`, inline: true },
          { name: "🛠️ Moderador", value: executor ? `<@${executor.id}>` : "Desconhecido", inline: true }
        )
        .setThumbnail(newMember.user.displayAvatarURL())
        .setTimestamp();

      return logChannel.send({ embeds: [embed] });
    }
  });

};
