const { EmbedBuilder, AuditLogEvent } = require("discord.js");

module.exports = (client) => {

  // 📌 CONFIG DE LOG POR SERVIDOR
  const LOG_CHANNELS = {
    "705954733742882907": "1479261311635554435",
    "1403143110694932570": "1484934763939631165",
    "1484725561002561597": "1484936001947308163"
  };

  //
  // 🔊 VOICE LOGS
  //
  client.on("voiceStateUpdate", async (oldState, newState) => {
    const guild = newState.guild;
    const logChannelId = LOG_CHANNELS[guild.id];
    if (!logChannelId) return;

    const logChannel = guild.channels.cache.get(logChannelId);
    if (!logChannel) return;

    let executor = null;

    // Função para pegar quem executou a ação via Audit Log
    const fetchExecutor = async (type) => {
      try {
        const logs = await guild.fetchAuditLogs({ limit: 5, type });
        const entry = logs.entries.find(
          e => e.target && e.target.id === newState.id && Date.now() - e.createdTimestamp < 10000
        );
        if (entry) return entry.executor;
      } catch {}
      return null;
    };

    // 🔁 MUDOU DE CANAL
    if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
      executor = await fetchExecutor(AuditLogEvent.MemberMove);

      const embed = new EmbedBuilder()
        .setColor("#8b5cf6")
        .setAuthor({ name: newState.member.user.tag, iconURL: newState.member.user.displayAvatarURL() })
        .setTitle("🔊 Movimento em canal de voz")
        .addFields(
          { name: "👤 Usuário", value: `<@${newState.id}>`, inline: true },
          { name: "🛠️ Ação", value: executor ? `Movido por <@${executor.id}>` : "Entrou sozinho", inline: true },
          { name: "📥 De", value: `${oldState.channel?.name || "Desconhecido"}`, inline: true },
          { name: "📤 Para", value: `${newState.channel?.name || "Desconhecido"}`, inline: true }
        )
        .setThumbnail(newState.member.user.displayAvatarURL())
        .setFooter({ text: `ID: ${newState.id}` })
        .setTimestamp();

      logChannel.send({ embeds: [embed] });
    }

    // ➕ ENTROU NA CALL
    if (!oldState.channelId && newState.channelId) {
      const embed = new EmbedBuilder()
        .setColor("#22c55e")
        .setAuthor({ name: newState.member.user.tag, iconURL: newState.member.user.displayAvatarURL() })
        .setTitle("➕ Entrou na call")
        .setDescription(`👤 <@${newState.id}> entrou em **${newState.channel.name}**`)
        .setThumbnail(newState.member.user.displayAvatarURL())
        .setTimestamp();

      logChannel.send({ embeds: [embed] });
    }

    // ➖ SAIU DA CALL
    if (oldState.channelId && !newState.channelId) {
      const embed = new EmbedBuilder()
        .setColor("#ef4444")
        .setAuthor({ name: newState.member.user.tag, iconURL: newState.member.user.displayAvatarURL() })
        .setTitle("➖ Saiu da call")
        .setDescription(`👤 <@${newState.id}> saiu de **${oldState.channel.name}**`)
        .setThumbnail(newState.member.user.displayAvatarURL())
        .setTimestamp();

      logChannel.send({ embeds: [embed] });
    }

    // 🔇 MUTE
    if (!oldState.serverMute && newState.serverMute) {
      executor = await fetchExecutor(AuditLogEvent.MemberUpdate);

      const embed = new EmbedBuilder()
        .setColor("#ef4444")
        .setAuthor({ name: newState.member.user.tag, iconURL: newState.member.user.displayAvatarURL() })
        .setTitle("🔇 Usuário mutado")
        .setDescription(`👤 <@${newState.id}>\n🛠️ ${executor ? `<@${executor.id}>` : "Sistema"}`)
        .setThumbnail(newState.member.user.displayAvatarURL())
        .setTimestamp();

      logChannel.send({ embeds: [embed] });
    }

    // 🔊 UNMUTE
    if (oldState.serverMute && !newState.serverMute) {
      executor = await fetchExecutor(AuditLogEvent.MemberUpdate);

      const embed = new EmbedBuilder()
        .setColor("#22c55e")
        .setAuthor({ name: newState.member.user.tag, iconURL: newState.member.user.displayAvatarURL() })
        .setTitle("🔊 Usuário desmutado")
        .setDescription(`👤 <@${newState.id}>\n🛠️ ${executor ? `<@${executor.id}>` : "Sistema"}`)
        .setThumbnail(newState.member.user.displayAvatarURL())
        .setTimestamp();

      logChannel.send({ embeds: [embed] });
    }
  });

  //
  // ⛓️ TIMEOUT LOGS
  //
  client.on("guildMemberUpdate", async (oldMember, newMember) => {
    const oldTimeout = oldMember.communicationDisabledUntilTimestamp;
    const newTimeout = newMember.communicationDisabledUntilTimestamp;

    if (oldTimeout === newTimeout) return;

    const guild = newMember.guild;
    const logChannelId = LOG_CHANNELS[guild.id];
    if (!logChannelId) return;

    const logChannel = guild.channels.cache.get(logChannelId);
    if (!logChannel) return;

    // função para pegar executor
    let executor = null;
    try {
      const logs = await guild.fetchAuditLogs({ limit: 5, type: AuditLogEvent.MemberUpdate });
      const entry = logs.entries.find(
        e => e.target && e.target.id === newMember.id && Date.now() - e.createdTimestamp < 10000
      );
      if (entry) executor = entry.executor;
    } catch {}

    // ⛓️ Timeout aplicado
    if (!oldTimeout && newTimeout) {
      const embed = new EmbedBuilder()
        .setColor("#f59e0b")
        .setAuthor({ name: newMember.user.tag, iconURL: newMember.user.displayAvatarURL() })
        .setTitle("⛓️ Timeout aplicado")
        .addFields(
          { name: "👤 Usuário", value: `<@${newMember.id}>`, inline: true },
          { name: "🛠️ Moderador", value: executor ? `<@${executor.id}>` : "Sistema", inline: true },
          { name: "⏳ Expira", value: `<t:${Math.floor(newTimeout / 1000)}:R>`, inline: true }
        )
        .setThumbnail(newMember.user.displayAvatarURL())
        .setTimestamp();

      logChannel.send({ embeds: [embed] });
    }

    // 🔓 Timeout removido
    if (oldTimeout && !newTimeout) {
      const embed = new EmbedBuilder()
        .setColor("#22c55e")
        .setAuthor({ name: newMember.user.tag, iconURL: newMember.user.displayAvatarURL() })
        .setTitle("🔓 Timeout removido")
        .addFields(
          { name: "👤 Usuário", value: `<@${newMember.id}>`, inline: true },
          { name: "🛠️ Moderador", value: executor ? `<@${executor.id}>` : "Sistema", inline: true }
        )
        .setThumbnail(newMember.user.displayAvatarURL())
        .setTimestamp();

      logChannel.send({ embeds: [embed] });
    }
  });

};
