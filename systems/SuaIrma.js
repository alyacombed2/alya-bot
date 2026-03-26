const fs = require("fs");
const path = require("path");
const prism = require("prism-media");
const ffmpegStatic = require('ffmpeg-static'); // <- ADICIONE ESTA LINHA

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
    console.log(`[SOM] ${new Date().toLocaleTimeString()} ${msg}`);
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
      fs.mkdirSync(SOUND_FOLDER, { recursive: true });
      log(`📁 Criada pasta: ${SOUND_FOLDER}`);
      return [];
    }

    const files = fs.readdirSync(SOUND_FOLDER).filter(file =>
      /\.(ogg|mp3|wav)$/i.test(file)
    );

    log(`🎵 Sons: ${files.length} (${files.join(", ") || "vazio"})`);
    return files;
  }

  function getRandomSound() {
    const files = getAllSounds();
    return files.length ? path.join(SOUND_FOLDER, files[Math.floor(Math.random() * files.length)]) : null;
  }

  function getSpecificSound(nameOrNumber) {
    const files = getAllSounds();
    const found = files.find(file => path.parse(file).name === String(nameOrNumber));
    return found ? path.join(SOUND_FOLDER, found) : null;
  }

  function stopCurrentAudio() {
    if (currentPlayer) currentPlayer.stop(true);
    if (currentConnection) currentConnection.destroy();
    currentPlayer = null;
    currentConnection = null;
    isPlaying = false;
    log("🛑 Áudio parado");
  }

  // 🔥 FUNÇÃO PRINCIPAL CORRIGIDA
  async function createAudioResourceSafe(soundPath) {
    log(`🎧 Processando: ${path.basename(soundPath)}`);

    // Tenta OggOpus primeiro (rápido)
    try {
      const resource = createAudioResource(soundPath, {
        inputType: StreamType.OggOpus,
        inlineVolume: true
      });
      log("✅ OggOpus direto!");
      return resource;
    } catch {}

    // FFmpeg-static (FUNCIONA SEMPRE)
    try {
      log("⚙️ Usando FFmpeg-static...");
      const transcoder = new prism.FFmpeg({
        path: ffmpegStatic,
        args: [
          "-i", soundPath,
          "-f", "s16le",
          "-ar", "48000",
          "-ac", "2",
          "-vn",
          "-loglevel", "error"
        ]
      });

      const resource = createAudioResource(transcoder, {
        inputType: StreamType.Raw,
        inlineVolume: true
      });
      
      log("✅ FFmpeg-static OK!");
      return resource;
    } catch (e) {
      throw new Error(`Erro no áudio: ${e.message}`);
    }
  }

  async function tocarSom(channel, soundPath, forced = false) {
    if (isPlaying) return { ok: false, error: "Já tocando..." };

    isPlaying = true;
    
    try {
      log(`${forced ? "👆 MANUAL" : "🎲 AUTO"} ${path.basename(soundPath)}`);

      const connection = joinVoiceChannel({
        channelId: channel.id,
        guildId: channel.guild.id,
        adapterCreator: channel.guild.voiceAdapterCreator
      });

      currentConnection = connection;
      await entersState(connection, VoiceConnectionStatus.Ready, 5000);

      const player = createAudioPlayer({
        behaviors: { noSubscriber: NoSubscriberBehavior.Pause }
      });
      currentPlayer = player;

      const resource = await createAudioResourceSafe(soundPath);
      resource.volume.setVolume(0.8);

      connection.subscribe(player);
      player.play(resource);

      player.once(AudioPlayerStatus.Playing, () => log("▶️ TOCANDO!"));
      player.once(AudioPlayerStatus.Idle, () => {
        log("✅ FINALIZOU");
        stopCurrentAudio();
        if (!forced) setTimeout(verificarEAgendar, 2000);
      });

      return { ok: true, file: path.basename(soundPath) };
    } catch (err) {
      log(`❌ ERRO: ${err.message}`);
      stopCurrentAudio();
      return { ok: false, error: err.message };
    }
  }

  function verificarEAgendar() {
    if (!systemEnabled || isPlaying) return;

    const guild = client.guilds.cache.first();
    if (!guild) return;

    const channel = guild.channels.cache.get(TARGET_VOICE_CHANNEL_ID);
    if (!channel?.isVoiceBased()) return;

    const humans = getHumanMembers(channel);
    if (humans.size < 2) {
      if (nextTimeout) clearTimeout(nextTimeout);
      return;
    }

    if (nextTimeout) return;

    const delay = getRandomDelay();
    log(`⏰ ${humans.size}ppl - próximo em ${Math.round(delay/60000)}min`);

    nextTimeout = setTimeout(async () => {
      const channel = guild.channels.cache.get(TARGET_VOICE_CHANNEL_ID);
      if (channel?.isVoiceBased() && getHumanMembers(channel).size >= 2) {
        const sound = getRandomSound();
        if (sound) await tocarSom(channel, sound);
      }
      verificarEAgendar();
    }, delay);
  }

  client.once("ready", () => {
    log("🚀 SISTEMA ONLINE!");
    log(`📁 Pasta: ${SOUND_FOLDER}`);
    getAllSounds(); // Lista inicial
    setInterval(verificarEAgendar, 30000);
    verificarEAgendar();
  });

  client.on("voiceStateUpdate", verificarEAgendar);

  client.on("messageCreate", async (msg) => {
    if (msg.author.bot || msg.author.id !== OWNER_ID) return;
    
    const [cmd, arg] = msg.content.split(/\s+/);
    const channel = msg.guild.channels.cache.get(TARGET_VOICE_CHANNEL_ID);

    switch (cmd?.toLowerCase()) {
      case "!tocar":
        if (!channel?.isVoiceBased()) return msg.reply("❌ Canal inválido");
        if (getHumanMembers(channel).size < 1) return msg.reply("❌ Call vazia");

        const sound = arg === "aleatorio" ? getRandomSound() : getSpecificSound(arg);
        if (!sound) return msg.reply("❌ Som não existe. `!lista`");

        const result = await tocarSom(channel, sound, true);
        msg.reply(result.ok ? `🔊 **${result.file}**` : `❌ ${result.error}`);

      case "!lista":
        const sounds = getAllSounds();
        msg.reply(sounds.length ? `🎵 **${sounds.length} sons**:\n\`${sounds.map(p=>path.parse(p).name).join(' | ')}\`` : "❌ Pasta vazia");

      case "!parar":
        stopCurrentAudio();
        msg.reply("🛑 Parado");

      case "!somoff":
        systemEnabled = false;
        clearTimeout(nextTimeout);
        stopCurrentAudio();
        msg.reply("🛑 Auto OFF");

      case "!somon":
        systemEnabled = true;
        verificarEAgendar();
        msg.reply("✅ Auto ON");
    }
  });
};
