const {
  GatewayIntentBits,
  ActivityType,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  InteractionType,
  REST,
  Routes
} = require("discord.js");

module.exports = (client) => {

const GUILD_ID = "1467265519676559502"; 
const CLIENT_ID = "1467477370075091055"; 

const ALLOWED_ROLES = [
  "1467271978313580707",
  "1467272008193671188",
  "1478154024866943199",
  "1479569171523043525",
];

const STOCK_ROLE_ID = "1467271978313580707";
const USER_ID = "1372615579407618209"; // Usuário específico
const SPECIAL_ROLE_ID = "1484705404385628334"; // Cargo especial

client.once("clientReady", async () => {

  console.log(`✅ Bot online como ${client.user.tag}`);

  client.user.setActivity("🎮・OrbitStore", {
    type: ActivityType.Playing,
  });

  const commands = [
    {
      name: "stock",
      description: "Atualiza o stock do servidor",
    },
  ];

  const rest = new REST({ version: "10" }).setToken(client.token);

  try {

    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );

    console.log("✅ Comando /stock registrado no servidor!");

  } catch (err) {

    console.error("Erro ao registrar comando:", err);

  }

});

client.on("messageCreate", async (message) => {

  if (message.author.bot || !message.guild) return;

  const member = message.member;
  if (!member) return;

  const hasPermission = member.roles.cache.some(role =>
    ALLOWED_ROLES.includes(role.id)
  );

  // 🔥 NOVO: Comando !remover e !adicionar
  if (message.content === "!remover" || message.content === "!adicionar") {
    try {
      await message.delete(); // Apaga a mensagem do bot

      const targetUser = message.guild.members.cache.get(USER_ID);
      if (!targetUser) {
        return message.channel.send("❌ Usuário não encontrado!").then(msg => {
          setTimeout(() => msg.delete().catch(() => {}), 3000);
        });
      }

      const specialRole = message.guild.roles.cache.get(SPECIAL_ROLE_ID);
      if (!specialRole) {
        return message.channel.send("❌ Cargo não encontrado!").then(msg => {
          setTimeout(() => msg.delete().catch(() => {}), 3000);
        });
      }

      if (message.content === "!remover") {
        // Remove o cargo
        if (targetUser.roles.cache.has(SPECIAL_ROLE_ID)) {
          await targetUser.roles.remove(SPECIAL_ROLE_ID);
          message.channel.send(`✅ Cargo **${specialRole.name}** removido de <@${USER_ID}>!`);
        } else {
          message.channel.send(`⚠️ <@${USER_ID}> não tem o cargo **${specialRole.name}**!`);
        }
      } 

      if (message.content === "!adicionar") {
        // Adiciona o cargo ao próprio autor
        if (!member.roles.cache.has(SPECIAL_ROLE_ID)) {
          await member.roles.add(SPECIAL_ROLE_ID);
          message.channel.send(`✅ Cargo **${specialRole.name}** adicionado a você!`);
        } else {
          message.channel.send(`⚠️ Você já tem o cargo **${specialRole.name}**!`);
        }
      }

    } catch (err) {
      console.error("Erro no comando remover/adicionar:", err);
      message.channel.send("❌ Erro ao executar comando!").then(msg => {
        setTimeout(() => msg.delete().catch(() => {}), 3000);
      });
    }
    return;
  }

  if (!hasPermission) return;

  try {

    if (message.content === "!pix") {

      await message.delete();

      const embed = new EmbedBuilder()
        .setColor("#c9a7ff")
        .setDescription(
`<:pix:1467502803898466529> ﹒✿゛**Pagamento via PIX** ♡ <:pix:1467502803898466529>

<:mm2:1467502795526639819> **Orbit Store | MM2**
<:seta:1467509708503126250> **Chave PIX:** \`miguelmarchetti4@gmail.com\`

<:zerotwo:1467509417938260203> Após o pagamento, **envie o comprovante**
<:coraao:1467509047782805607> Agradecemos a confiança!`
        )
        .setImage("https://media.discordapp.net/attachments/1376263450011107359/1467348866125795561/content.png")
        .setFooter({ text: "🎮 Orbit Store ♡" });

      message.channel.send({ embeds: [embed] });

    }

    if (message.content === "!processando") {

      await message.delete();

      const embed = new EmbedBuilder()
        .setColor("#ffe08a")
        .setDescription(
`<:morango:1467510010408997108> ﹒✿゛**Pagamento em Processamento** ♡

<:mm2:1467502795526639819> **Orbit Store | MM2**
Pagamento recebido <:zerotwo:1467509417938260203>
Em análise pela equipe ⏳

<:coraao:1467509047782805607> Aguarde alguns instantes`
        )
        .setImage("https://media.discordapp.net/attachments/1376263450011107359/1467348866125795561/content.png")
        .setFooter({ text: "🎮 Orbit Store ♡" });

      message.channel.send({ embeds: [embed] });

    }

    if (message.content === "!concluido") {

      await message.delete();

      const embed = new EmbedBuilder()
        .setColor("#8affb1")
        .setDescription(
`<:certo:1467510357764472842> ﹒✿゛**Pagamento Concluído** ♡

<:mm2:1467502795526639819> **Orbit Store | MM2**
Pagamento confirmado 🎮
Seu item será entregue em instantes

<:coraao:1467509047782805607> Obrigado pela compra!`
        )
        .setImage("https://media.discordapp.net/attachments/1376263450011107359/1467348866125795561/content.png")
        .setFooter({ text: "🎮 Orbit Store ♡" });

      message.channel.send({ embeds: [embed] });

    }

    if (message.content === "!final") {

      await message.delete();

      const embed = new EmbedBuilder()
        .setColor("#bfa7ff")
        .setDescription(
`<:hellokitty:1467502793651912819> ﹒✿゛**Pedido Finalizado** ♡

<:mm2:1467502795526639819> **Orbit Store | MM2**
Pedido entregue com sucesso ⭐

Deixe seu feedback:
<:seta:1467509708503126250> <#1467490270869328022>
<:seta:1467509708503126250> <#1467267925412155575>`
        )
        .setImage("https://media.discordapp.net/attachments/1376263450011107359/1467348866125795561/content.png")
        .setFooter({ text: "🎮 Orbit Store ♡" });

      message.channel.send({ embeds: [embed] });

    }

  } catch (err) {

    console.error("Erro:", err);

  }

});

client.on("interactionCreate", async (interaction) => {

  if (interaction.isChatInputCommand() && interaction.commandName === "stock") {

    if (!interaction.member || !interaction.member.roles.cache.has(STOCK_ROLE_ID)) {

      return interaction.reply({
        content: "❌ Você não tem permissão.",
        ephemeral: true,
      });

    }

    const modal = new ModalBuilder()
      .setCustomId("stock_modal")
      .setTitle("📦 Atualizar Stock");

    const input = new TextInputBuilder()
      .setCustomId("stock_text")
      .setLabel("Digite o stock")
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true);

    modal.addComponents(new ActionRowBuilder().addComponents(input));

    await interaction.showModal(modal);

  }

  if (interaction.type === InteractionType.ModalSubmit && interaction.customId === "stock_modal") {

    const stock = interaction.fields.getTextInputValue("stock_text");

    const embed = new EmbedBuilder()
      .setColor("#c9a7ff")
      .setTitle("📦 Stock Atualizado <:hellokitty:1467502793651912819>")
      .setDescription(stock)
      .setFooter({ text: "🎮 Orbit Store ♡" });

    await interaction.channel.send({ embeds: [embed] });

    await interaction.reply({
      content: "✅ Stock enviado!",
      ephemeral: true,
    });

  }

});

};
