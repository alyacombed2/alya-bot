client.on("messageCreate", async (msg) => {
  if (msg.author.id !== OWNER_ID || msg.author.bot) return;
  
  const args = msg.content.trim().split(/\s+/);
  const cmd = args[0]?.toLowerCase();

  // 🆕 DIAGNÓSTICO COMPLETO
  if (cmd === "!debug") {
    const guild = msg.guild;
    if (!guild) return msg.reply("❌ Sem guild");

    const channel = guild.channels.cache.get(TARGET_VOICE_CHANNEL_ID);
    msg.reply(`
**🔍 DIAGNÓSTICO:**
\`\`\`
Guild: ${guild.name} (${guild.id})
Canal ID: ${TARGET_VOICE_CHANNEL_ID}
Canal existe: ${!!channel}
É voz: ${channel?.isVoiceBased() || 'NÃO'}
Membros na call: ${channel ? getHumanMembers(channel).size : 0}
Bot perms: ${guild.members.me?.permissions.toArray().join(', ') || 'NENHUMA'}
Sons: ${getSounds().length}
\`\`\``);
    return;
  }

  // 🆕 TESTA CONEXÃO SEM SOM
  if (cmd === "!connect") {
    const channel = msg.guild.channels.cache.get(TARGET_VOICE_CHANNEL_ID);
    if (!channel?.isVoiceBased()) return msg.reply("❌ Canal inválido");

    msg.reply("🔌 Tentando conectar...");
    
    const connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: channel.guild.id,
      adapterCreator: channel.guild.voiceAdapterCreator,
    });

    connection.on('stateChange', (old, newState) => {
      log(`Conexão: ${old.status} → ${newState.status}`);
    });

    const result = await entersState(connection, VoiceConnectionStatus.Ready, 30000)
      .then(() => {
        msg.reply("✅ **CONECTOU!** 🎉");
        setTimeout(() => connection.destroy(), 5000);
        return true;
      })
      .catch(err => {
        msg.reply(`❌ **Falhou conectar**\n\`${err.message}\``);
        connection.destroy();
        return false;
      });

    return;
  }

  // Resto dos comandos normais...
  if (cmd === "!lista") {
    // seu código de lista
  }
});
