const { EmbedBuilder, AuditLogEvent } = require("discord.js");

module.exports = (client) => {

// canais de log por servidor
const LOG_CHANNELS = {
    "1475590448600056025": "1479569064643919882", // servidor 1
    "705954733742882907": "1479261311635554435"  // servidor 2
};

function getLogChannel(guild) {
    const channelId = LOG_CHANNELS[guild.id];
    if (!channelId) return null;
    return guild.channels.cache.get(channelId);
}

//
// VOICE LOGS
//
client.on("voiceStateUpdate", async (oldState, newState) => {

const guild = newState.guild;
const logChannel = getLogChannel(guild);
if (!logChannel) return;

let executor = null;

try {

const logs = await guild.fetchAuditLogs({ limit: 1 });
const entry = logs.entries.first();

if (entry) executor = entry.executor;

} catch {}

//
// 🔊 USUÁRIO MOVIDO
//
if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {

const embed = new EmbedBuilder()
.setColor("#8b5cf6")
.setAuthor({
name: newState.member.user.tag,
iconURL: newState.member.user.displayAvatarURL()
})
.setTitle("🔊 Usuário movido de canal")
.addFields(
{ name: "👤 Usuário", value: `<@${newState.id}>`, inline: true },
{ name: "🛠️ Movido por", value: executor ? `<@${executor.id}>` : "Desconhecido", inline: true },
{ name: "📥 Canal anterior", value: `${oldState.channel.name}`, inline: true },
{ name: "📤 Canal atual", value: `${newState.channel.name}`, inline: true }
)
.setThumbnail(newState.member.user.displayAvatarURL())
.setFooter({ text: `ID do usuário: ${newState.id}` })
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
.setDescription(
`👤 Usuário: <@${newState.id}>
🛠️ Mutado por: ${executor ? `<@${executor.id}>` : "Desconhecido"}`
)
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
.setDescription(
`👤 Usuário: <@${newState.id}>
🛠️ Desmutado por: ${executor ? `<@${executor.id}>` : "Desconhecido"}`
)
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
const logChannel = getLogChannel(guild);
if (!logChannel) return;

setTimeout(async () => {

let executor = null;

try {

const logs = await guild.fetchAuditLogs({
limit: 1,
type: AuditLogEvent.MemberUpdate
});

const entry = logs.entries.first();

if (entry && entry.target.id === newMember.id) {
executor = entry.executor;
}

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
.setTitle("⛓️ Usuário castigado (Timeout)")
.addFields(
{ name: "👤 Usuário", value: `<@${newMember.id}>`, inline: true },
{ name: "🛠️ Moderador", value: executor ? `<@${executor.id}>` : "Desconhecido", inline: true },
{ name: "⏳ Expira em", value: `<t:${Math.floor(newTimeout / 1000)}:R>`, inline: true }
)
.setThumbnail(newMember.user.displayAvatarURL())
.setFooter({ text: `ID: ${newMember.id}` })
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
.setTitle("🔓 Castigo removido")
.addFields(
{ name: "👤 Usuário", value: `<@${newMember.id}>`, inline: true },
{ name: "🛠️ Moderador", value: executor ? `<@${executor.id}>` : "Desconhecido", inline: true }
)
.setThumbnail(newMember.user.displayAvatarURL())
.setTimestamp();

logChannel.send({ embeds: [embed] });

}

}, 1500);

});

};
