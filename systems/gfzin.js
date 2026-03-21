const { EmbedBuilder, AuditLogEvent } = require("discord.js");

module.exports = (client) => {

const LOG_CHANNEL = "1479261311635554435";

//
// 🔊 VOICE LOGS
//
client.on("voiceStateUpdate", async (oldState, newState) => {

const guild = newState.guild;
const logChannel = guild.channels.cache.get(LOG_CHANNEL);
if (!logChannel) return;

let executor = null;

try {
  const logs = await guild.fetchAuditLogs({
    limit: 5,
    type: AuditLogEvent.MemberMove
  });

  const entry = logs.entries.find(e =>
    e.target.id === newState.id &&
    Date.now() - e.createdTimestamp < 5000
  );

  if (entry) executor = entry.executor;

} catch {}

//
// 🔁 MUDOU DE CANAL
//
if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {

const embed = new EmbedBuilder()
.setColor("#8b5cf6")
.setAuthor({
  name: newState.member.user.tag,
  iconURL: newState.member.user.displayAvatarURL()
})
.setTitle("🔊 Movimento em canal de voz")
.addFields(
  { name: "👤 Usuário", value: `<@${newState.id}>`, inline: true },
  { name: "🛠️ Ação", value: executor ? `Movido por <@${executor.id}>` : "Entrou sozinho", inline: true },
  { name: "📥 De", value: `${oldState.channel.name}`, inline: true },
  { name: "📤 Para", value: `${newState.channel.name}`, inline: true }
)
.setThumbnail(newState.member.user.displayAvatarURL())
.setFooter({ text: `ID: ${newState.id}` })
.setTimestamp();

logChannel.send({ embeds: [embed] });

}

//
// ➕ ENTROU NA CALL
//
if (!oldState.channelId && newState.channelId) {

const embed = new EmbedBuilder()
.setColor("#22c55e")
.setAuthor({
  name: newState.member.user.tag,
  iconURL: newState.member.user.displayAvatarURL()
})
.setTitle("➕ Entrou na call")
.setDescription(`👤 <@${newState.id}> entrou em **${newState.channel.name}**`)
.setThumbnail(newState.member.user.displayAvatarURL())
.setTimestamp();

logChannel.send({ embeds: [embed] });

}

//
// ➖ SAIU DA CALL
//
if (oldState.channelId && !newState.channelId) {

const embed = new EmbedBuilder()
.setColor("#ef4444")
.setAuthor({
  name: newState.member.user.tag,
  iconURL: newState.member.user.displayAvatarURL()
})
.setTitle("➖ Saiu da call")
.setDescription(`👤 <@${newState.id}> saiu de **${oldState.channel.name}**`)
.setThumbnail(newState.member.user.displayAvatarURL())
.setTimestamp();

logChannel.send({ embeds: [embed] });

}

//
// 🔇 MUTE
//
if (!oldState.serverMute && newState.serverMute) {

const embed = new EmbedBuilder()
.setColor("#ef4444")
.setAuthor({
  name: newState.member.user.tag,
  iconURL: newState.member.user.displayAvatarURL()
})
.setTitle("🔇 Usuário mutado")
.setDescription(`👤 <@${newState.id}>\n🛠️ ${executor ? `<@${executor.id}>` : "Sistema/Desconhecido"}`)
.setThumbnail(newState.member.user.displayAvatarURL())
.setTimestamp();

logChannel.send({ embeds: [embed] });

}

//
// 🔊 UNMUTE
//
if (oldState.serverMute && !newState.serverMute) {

const embed = new EmbedBuilder()
.setColor("#22c55e")
.setAuthor({
  name: newState.member.user.tag,
  iconURL: newState.member.user.displayAvatarURL()
})
.setTitle("🔊 Usuário desmutado")
.setDescription(`👤 <@${newState.id}>\n🛠️ ${executor ? `<@${executor.id}>` : "Sistema/Desconhecido"}`)
.setThumbnail(newState.member.user.displayAvatarURL())
.setTimestamp();

logChannel.send({ embeds: [embed] });

}

});


//
// ⛓️ TIMEOUT
//
client.on("guildMemberUpdate", async (oldMember, newMember) => {

const oldTimeout = oldMember.communicationDisabledUntilTimestamp;
const newTimeout = newMember.communicationDisabledUntilTimestamp;

if (oldTimeout === newTimeout) return;

const guild = newMember.guild;
const logChannel = guild.channels.cache.get(LOG_CHANNEL);
if (!logChannel) return;

setTimeout(async () => {

let executor = null;

try {
  const logs = await guild.fetchAuditLogs({
    limit: 5,
    type: AuditLogEvent.MemberUpdate
  });

  const entry = logs.entries.find(e =>
    e.target.id === newMember.id &&
    Date.now() - e.createdTimestamp < 5000
  );

  if (entry) executor = entry.executor;

} catch {}

//
// ⛓️ TIMEOUT APLICADO
//
if (!oldTimeout && newTimeout) {

const embed = new EmbedBuilder()
.setColor("#f59e0b")
.setAuthor({
  name: newMember.user.tag,
  iconURL: newMember.user.displayAvatarURL()
})
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

//
// 🔓 TIMEOUT REMOVIDO
//
if (oldTimeout && !newTimeout) {

const embed = new EmbedBuilder()
.setColor("#22c55e")
.setAuthor({
  name: newMember.user.tag,
  iconURL: newMember.user.displayAvatarURL()
})
.setTitle("🔓 Timeout removido")
.addFields(
  { name: "👤 Usuário", value: `<@${newMember.id}>`, inline: true },
  { name: "🛠️ Moderador", value: executor ? `<@${executor.id}>` : "Sistema", inline: true }
)
.setThumbnail(newMember.user.displayAvatarURL())
.setTimestamp();

logChannel.send({ embeds: [embed] });

}

}, 1500);

});

};
