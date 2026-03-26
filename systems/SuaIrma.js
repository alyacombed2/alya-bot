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
    console.log(`[RANDOM SOUND] ${new Date().toLocaleTimeString()} ${msg}`);
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
      // Aceita .ogg e .mp3 também
      /\.(ogg|mp3|wav|webm)$/i.test(file)
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
      if (currentPlayer) {
        currentPlayer.stop(true);
        log("Player parado.");
      }
    } catch (e) {
      log(`Erro ao parar player: ${e.message}`);
    }

    try {
      if (currentConnection) {
        currentConnection.destroy();
        log("Conexão destruída.");
      }
    } catch (e) {
      log(`Erro ao destruir conexão: ${e.message}`);
    }

    currentPlayer = null;
    currentConnection = null;
    isPlaying = false;
  }

  // ✅ NOVA FUNÇÃO: Tenta diferentes formatos
  async function createAudioResourceSafe(soundPath) {
    log(`🔍 Tentando criar resource para: ${path.basename(soundPath)}`);

    // 1º Tenta WebmOpus (mais confiável)
    try {
      log("📦 Tentativa 1: WebmOpus");
      const resource = createAudioResource(soundPath, {
        inputType: StreamType.WebmOpus,
        inlineVolume: true
      });
      log("✅ WebmOpus funcionou!");
      return resource;
    } catch (e) {
      log(`❌ WebmOpus falhou: ${e.message}`);
    }

    // 2º Tenta OggOpus
    try {
      log("🎵 Tentativa 2: OggOpus");
      const resource = createAudioResource(soundPath, {
        inputType: StreamType.OggOpus,
        inlineVolume: true
      });
      log("✅ OggOpus funcionou!");
      return resource;
    } catch (e) {
      log(`❌ OggOpus falhou: ${e.message}`);
    }

    // 3º Tenta FFmpeg (último recurso)
    try {
      log("⚙️ Tentativa 3: FFmpeg");
      
      // Verifica se FFmpeg existe
      const { execSync } = require('child_process');
      execSync('ffmpeg -version', { stdio: 'ignore' });
      
      const transcoder = new prism.FFmpeg({
        args: [
          "-reconnect", "1",
          "-reconnect_streamed", "1",
          "-reconnect_delay_max", "5",
          "-analyzeduration", "0",
          "-loglevel", "error",
          "-i", soundPath,
          "-f", "s16le",
          "-ar", "48000",
          "-ac", "2"
        ]
      });

      const resource = createAudioResource(transcoder, {
        inputType: StreamType.Raw,
        inlineVolume: true
      });

      log("✅ FFmpeg funcionou!");
      return resource;
    } catch (e) {
      log(`❌ FFmpeg falhou: ${e.message}`);
      throw new Error("Nenhum formato de áudio funcionou. Tente converter para .ogg ou .mp3");
    }
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

      log(`${forced ? "🔊 TOQUE MANUAL" : "🎲 TOQUE AUTOMÁTICO"} -> ${path.basename(soundPath)}`);

      const connection = joinVoiceChannel({
        channelId: channel.id,
        guildId: channel.guild.id,
        adapterCreator: channel.guild.voiceAdapterCreator,
        selfDeaf: false,
        selfMute: false
      });

      currentConnection = connection;

      connection.on(VoiceConnectionStatus.Ready, () => {
        log("✅ Conexão pronta!");
      });

      connection.on("stateChange", (oldState, newState) => {
        log(`Conexão: ${oldState.status} → ${newState.status}`);
      });

      await entersState(connection, VoiceConnectionStatus.Ready, 5000);

      const player = createAudioPlayer({
        behaviors: {
          noSubscriber: NoSubscriberBehavior.Pause
        }
      });

      currentPlayer = player;

      player.on("stateChange", (oldState, newState) => {
        log(`Player: ${oldState.status} → ${newState.status}`);
      });

      player.on("error", (err) => {
        log(`❌ ERRO PLAYER: ${err.message}`);
        log(err.stack);
        stopCurrentAudio();
      });

      // 🎯 CRIA O RESOURCE COM FALLBACK
      const resource = await createAudioResourceSafe(soundPath);
      resource.volume.setVolume(0.8); // Volume um pouco menor

      connection.subscribe(player);
      player.play(resource);

      player.once(AudioPlayerStatus.Playing, () => {
        log(`▶️ TOCANDO: ${path.basename(soundPath)}`);
      });

      player.once(AudioPlayerStatus.Idle, () => {
        log(`✅ FINALIZADO: ${path.basename(soundPath)}`);
        stopCurrentAudio();

        setTimeout(() => {
          if (!forced) verificarEAgendar();
        }, 2000);
      });

      return { ok: true, file: path.basename(soundPath) };
    } catch (err) {
      log(`❌ ERRO TOTAL: ${err.message}`);
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

      log(`👥 ${humans.size} pessoas na call. ⏰ Próximo em ~${minutos}min`);

      nextTimeout = setTimeout(async () => {
        nextTimeout = null;

        const updatedChannel = guild.channels.cache.get(TARGET_VOICE_CHANNEL_ID);
        if (!updatedChannel || !updatedChannel.isVoiceBased()) return;

        const updatedHumans = getHumanMembers(updatedChannel);

        if (updatedHumans.size >= 2) {
          const soundPath = getRandomSound();
          await tocarSom(updatedChannel, soundPath, false);
        } else {
          log("👥 Poucas pessoas agora, reagendando...");
          verificarEAgendar();
        }
      }, delay);
    } else {
      cancelSchedule();
      log("😴 Poucas pessoas na call, aguardando...");
    }
  }

  // Resto dos eventos iguais...
  client.once("ready", () => {
    log("🚀 Bot online - Sistema de sons iniciado!");
    
    // Verifica FFmpeg na inicialização
    try {
      require('child_process').execSync('ffmpeg -version', { stdio: 'ignore' });
      log("✅ FFmpeg encontrado!");
    } catch {
      log("⚠️ FFmpeg NÃO encontrado! Use apenas .ogg/.mp3");
    }

    setInterval(() => {
      verificarEAgendar();
    }, 30000);

    verificarEAgendar();
  });

  client.on("voiceStateUpdate", () => {
    verificarEAgendar();
  });

  // Comandos iguais (mantive os mesmos)
  client.on("messageCreate", async (message) => {
    if (!message.guild || message.author.bot) return;
    if (message.author.id !== OWNER_ID) return;

    const args = message.content.trim().split(/\s+/);
    const cmd = args[0]?.toLowerCase();

    if (cmd === "!tocar") {
      const guild = message.guild;
      const channel = guild.channels.cache.get(TARGET_VOICE_CHANNEL_ID);

      if (!channel || !channel.isVoiceBased()) {
        return message.reply("❌ Canal de voz não encontrado.");
      }

      const humans = getHumanMembers(channel);
      if (humans.size < 1) {
        return message.reply("❌ Ninguém na call.");
      }

      const escolha = args[1];
      let soundPath = null;

      if (!escolha || escolha.toLowerCase() === "aleatorio") {
        soundPath = getRandomSound();
      } else {
        soundPath = getSpecificSound(escolha);
      }

      if (!soundPath) {
        return message.reply("❌ Som não encontrado. Use `!lista`");
      }

      const result = await tocarSom(channel, soundPath, true);

      if (!result.ok) {
        return message.reply(`❌ Erro: ${result.error}`);
      }

      return message.reply(`🔊 Tocando: **${result.file}** 🎵`);
    }

    if (cmd === "!somtest") {
      const sounds = getAllSounds();
      if (!sounds.length) {
        return message.reply("❌ Pasta `Sounds` vazia!");
      }
      message.reply(`📂 Sons encontrados: ${sounds.length}\nUsa \`!tocar 1\` pra testar`);
    }

    if (cmd === "!parar") {
      stopCurrentAudio();
      return message.reply("🛑 Parado!");
    }

    if (cmd === "!somoff") {
      systemEnabled = false;
      cancelSchedule();
      stopCurrentAudio();
      return message.reply("🛑 Sistema automático OFF");
    }

    if (cmd === "!somon") {
      systemEnabled = true;
      verificarEAgendar();
      return message.reply("✅ Sistema automático ON");
    }

    if (cmd === "!lista") {
      const sounds = getAllSounds();
      if (!sounds.length) {
        return message.reply("❌ Nenhum som na pasta `Sounds`");
      }
      const lista = sounds.map(s => path.parse(s).name).join(", ");
      return message.reply(`🎵 **Sons (${sounds.length})**:\n\`${lista}\``);
    }
  });
};
