const fs = require("fs");
const path = require("path");
const prism = require("prism-media");

const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  NoSubscriberBehavior,
  VoiceConnectionStatus,
  entersState,
  StreamType
} = require("@discordjs/voice");

module.exports = (client) => {
  const TARGET_VOICE_CHANNEL_ID = "1476321416470335659";
  const SOUND_FOLDER = path.join(__dirname, "Sounds");
  const OWNER_ID = "1372615579407618209";

  const MIN_TIME = 10 * 60 * 1000;
  const MAX_TIME = 20 * 60 * 1000;

  let nextTimeout = null;
  let isPlaying = false;
  let systemEnabled = true;
  let currentConnection = null;
  let currentPlayer = null;

  function log(msg) {
    console.log(`[RANDOM SOUND] ${msg}`);
  }

  function getHumanMembers(channel) {
    if (!channel) return [];
    return channel.members.filter(member => !member.user.bot);
  }

  function getRandomDelay() {
    return Math.floor(Math.random() * (MAX_TIME - MIN_TIME + 1)) + MIN_TIME;
  }

  function getAllSounds() {
    if (!fs.existsSync(SOUND_FOLDER)) {
      log(`❌ Pasta não encontrada: ${SOUND_FOLDER}`);
      return [];
    }

    const files = fs.readdirSync(SOUND_FOLDER).filter(file =>
      path.extname(file).toLowerCase() === ".ogg"
    );

    log(`Sons encontrados: ${files.join(", ") || "nenhum"}`);
    return files;
  }

  function getRandomSound() {
    const files = getAllSounds();
    if (!files.length) return null;

    const randomFile = files[Math.floor(Math.random() * files.length)];
    return path.join(SOUND_FOLDER, randomFile);
  }

  function getSpecificSound(nameOrNumber) {
    const files = getAllSounds();
    if (!files.length) return null;

    const found = files.find(file => path.parse(file).name === String(nameOrNumber));
    if (!found) return null;

    return path.join(SOUND_FOLDER, found);
  }

  function cancelSchedule() {
    if (nextTimeout) {
      clearTimeout(nextTimeout);
      nextTimeout = null;
      log("Agendamento cancelado.");
    }
  }

  function stopCurrentAudio() {
    try {
      if (currentPlayer) currentPlayer.stop();
    } catch {}

    try {
      if (currentConnection) currentConnection.destroy();
    } catch {}

    currentPlayer = null;
    currentConnection = null;
    isPlaying = false;
  }

  async function tocarSom(channel, soundPath, forced = false) {
    if (isPlaying) {
      return { ok: false, error: "Já estou tocando um som agora." };
    }

    isPlaying = true;

    try {
      if (!soundPath || !fs.existsSync(soundPath)) {
        isPlaying = false;
        return { ok: false, error: "Arquivo de som não encontrado." };
      }

      log(`${forced ? "TOQUE MANUAL" : "TOQUE AUTOMÁTICO"} -> ${path.basename(soundPath)}`);

      const connection = joinVoiceChannel({
        channelId: channel.id,
        guildId: channel.guild.id,
        adapterCreator: channel.guild.voiceAdapterCreator,
        selfDeaf: false,
        selfMute: false
      });

      currentConnection = connection;

      connection.on("stateChange", (oldState, newState) => {
        log(`Conexão mudou: ${oldState.status} -> ${newState.status}`);
      });

      await entersState(connection, VoiceConnectionStatus.Ready, 30000);

      const player = createAudioPlayer({
        behaviors: {
          noSubscriber: NoSubscriberBehavior.Play
        }
      });

      currentPlayer = player;

      player.on("stateChange", (oldState, newState) => {
        log(`Player mudou: ${oldState.status} -> ${newState.status}`);
      });

      player.on("error", (err) => {
        log(`❌ Erro no player: ${err.message}`);
        stopCurrentAudio();

        setTimeout(() => {
          if (!forced) verificarEAgendar();
        }, 5000);
      });

      const transcoder = new prism.FFmpeg({
        args: [
          "-reconnect", "1",
          "-reconnect_streamed", "1",
          "-reconnect_delay_max", "5",
          "-analyzeduration", "0",
          "-loglevel", "0",
          "-i", soundPath,
          "-f", "s16le",
          "-ar", "48000",
          "-ac", "2"
        ]
      });

      transcoder.on("error", (err) => {
        log(`❌ FFmpeg erro: ${err.message}`);
      });

      const resource = createAudioResource(transcoder, {
        inputType: StreamType.Raw,
        inlineVolume: true
      });

      resource.volume.setVolume(1.0);

      connection.subscribe(player);
      player.play(resource);

      player.once(AudioPlayerStatus.Playing, () => {
        log(`▶️ Tocando agora: ${path.basename(soundPath)}`);
      });

      player.once(AudioPlayerStatus.Idle, () => {
        log(`✅ Som finalizado: ${path.basename(soundPath)}`);
        stopCurrentAudio();

        setTimeout(() => {
          if (!forced) verificarEAgendar();
        }, 5000);
      });

      return { ok: true, file: path.basename(soundPath) };
    } catch (err) {
      log(`❌ Erro ao tocar som: ${err.message}`);
      stopCurrentAudio();
      return { ok: false, error: err.message };
    }
  }

  function verificarEAgendar() {
    if (!systemEnabled) return;
    if (isPlaying) return;

    const guild = client.guilds.cache.first();
    if (!guild) return;

    const channel = guild.channels.cache.get(TARGET_VOICE_CHANNEL_ID);
    if (!channel || !channel.isVoiceBased()) return;

    const humans = getHumanMembers(channel);

    if (humans.size >= 2) {
      if (nextTimeout) return;

      const delay = getRandomDelay();
      const minutos = Math.floor(delay / 60000);

      log(`Tem ${humans.size} pessoas na call. Próximo som em ~${minutos} min.`);

      nextTimeout = setTimeout(async () => {
        nextTimeout = null;

        const updatedChannel = guild.channels.cache.get(TARGET_VOICE_CHANNEL_ID);
        if (!updatedChannel || !updatedChannel.isVoiceBased()) return;

        const updatedHumans = getHumanMembers(updatedChannel);

        if (updatedHumans.size >= 2) {
          const soundPath = getRandomSound();
          await tocarSom(updatedChannel, soundPath, false);
        } else {
          log("Não há pessoas suficientes na call no momento do toque.");
          verificarEAgendar();
        }
      }, delay);
    } else {
      cancelSchedule();
    }
  }

  client.once("clientReady", () => {
    log("Sistema de sons aleatórios iniciado.");

    setInterval(() => {
      verificarEAgendar();
    }, 30000);

    verificarEAgendar();
  });

  client.on("voiceStateUpdate", () => {
    verificarEAgendar();
  });

  client.on("messageCreate", async (message) => {
    if (!message.guild || message.author.bot) return;
    if (message.author.id !== OWNER_ID) return;

    const args = message.content.trim().split(/\s+/);
    const cmd = args[0]?.toLowerCase();

    if (cmd === "!tocar") {
      const guild = message.guild;
      const channel = guild.channels.cache.get(TARGET_VOICE_CHANNEL_ID);

      if (!channel || !channel.isVoiceBased()) {
        return message.reply("❌ Não encontrei o canal de voz configurado.");
      }

      const humans = getHumanMembers(channel);

      if (humans.size < 1) {
        return message.reply("❌ Não tem ninguém na call para eu tocar.");
      }

      const escolha = args[1];
      let soundPath = null;

      if (!escolha || escolha.toLowerCase() === "aleatorio") {
        soundPath = getRandomSound();
      } else {
        soundPath = getSpecificSound(escolha);
      }

      if (!soundPath) {
        return message.reply("❌ Não achei esse áudio. Ex: `!tocar 1`, `!tocar 7`, `!tocar 12` ou `!tocar aleatorio`");
      }

      const result = await tocarSom(channel, soundPath, true);

      if (!result.ok) {
        return message.reply(`❌ Erro ao tocar: ${result.error}`);
      }

      return message.reply(`🔊 Tocando agora: \`${result.file}\``);
    }

    if (cmd === "!somtest") {
      const guild = message.guild;
      const channel = guild.channels.cache.get(TARGET_VOICE_CHANNEL_ID);

      if (!channel || !channel.isVoiceBased()) {
        return message.reply("❌ Não encontrei o canal de voz.");
      }

      const soundPath = getRandomSound();
      if (!soundPath) {
        return message.reply("❌ Nenhum som encontrado na pasta `systems/Sounds`.");
      }

      const result = await tocarSom(channel, soundPath, true);

      if (!result.ok) {
        return message.reply(`❌ Erro: ${result.error}`);
      }

      return message.reply(`🧪 Testando som: \`${result.file}\``);
    }

    if (cmd === "!parar") {
      stopCurrentAudio();
      return message.reply("🛑 Som parado.");
    }

    if (cmd === "!somoff") {
      systemEnabled = false;
      cancelSchedule();
      stopCurrentAudio();
      return message.reply("🛑 Sistema de sons automáticos desativado.");
    }

    if (cmd === "!somon") {
      systemEnabled = true;
      verificarEAgendar();
      return message.reply("✅ Sistema de sons automáticos ativado.");
    }

    if (cmd === "!lista") {
      const sounds = getAllSounds();
      if (!sounds.length) {
        return message.reply("❌ Nenhum som encontrado.");
      }

      return message.reply(`🎵 Sons disponíveis:\n\`${sounds.map(s => path.parse(s).name).join(", ")}\``);
    }
  });
};
