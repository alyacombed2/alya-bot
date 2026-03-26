const fs = require("fs");
const path = require("path");
const prism = require("prism-media");
const ffmpegStatic = require('ffmpeg-static');

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

  let currentConnection = null;
  let currentPlayer = null;
  let isPlaying = false;

  function log(msg) {
    console.log(`[🎵 SOM] ${new Date().toLocaleTimeString()} ${msg}`);
  }

  function getSounds() {
    try {
      if (!fs.existsSync(SOUND_FOLDER)) {
        log(`❌ Pasta não existe: ${SOUND_FOLDER}`);
        return [];
      }
      return fs.readdirSync(SOUND_FOLDER)
        .filter(f => f.endsWith('.ogg'))
        .map(f => path.join(SOUND_FOLDER, f));
    } catch {
      return [];
    }
  }

  function stopAll() {
    try {
      currentPlayer?.stop();
    } catch {}
    try {
      currentConnection?.destroy();
    } catch {}
    currentPlayer = null;
    currentConnection = null;
    isPlaying = false;
    log("🛑 Tudo parado");
  }

  // 🎯 SEMPRE USA FFMPEG-STATIC (MAIS ESTÁVEL)
  async function createResource(soundPath) {
    log(`🔧 FFmpeg: ${path.basename(soundPath)}`);
    
    const transcoder = new prism.FFmpeg({
      path: ffmpegStatic,
      args: [
        '-i', soundPath,
        '-analyzeduration', '0',
        '-loglevel', 'error',
        '-f', 's16le',
        '-ar', '48000', 
        '-ac', '2'
      ]
    });

    return createAudioResource(transcoder, {
      inputType: StreamType.Raw,
      inlineVolume: true
    });
  }

  async function playInChannel(channel, soundPath) {
    if (isPlaying) throw new Error("Já tocando");

    isPlaying = true;
    log(`🎵 Iniciando: ${path.basename(soundPath)}`);

    // 🔗 CONEXÃO COM TIMEOUT MAIOR
    const connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: channel.guild.id,
      adapterCreator: channel.guild.voiceAdapterCreator,
      selfDeaf: false,
      selfMute: false
    });

    currentConnection = connection;

    // Espera conexão (20s ao invés de 5s)
    try {
      await entersState(connection, VoiceConnectionStatus.Ready, 20000);
      log("✅ Conectado!");
    } catch {
      throw new Error("Timeout conexão (20s)");
    }

    const player = createAudioPlayer({
      behaviors: { noSubscriber: NoSubscriberBehavior.Play }
    });
    currentPlayer = player;

    connection.subscribe(player);

    const resource = await createResource(soundPath);
    resource.volume.setVolume(1.0);

    player.play(resource);

    // Eventos
    player.on('stateChange', (old, newState) => {
      log(`Player: ${old.status} → ${newState.status}`);
    });

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        log("⏰ Timeout 30s");
        stopAll();
        resolve(false);
      }, 30000);

      player.once(AudioPlayerStatus.Playing, () => {
        log("▶️ TOCANDO!");
        clearTimeout(timeout);
      });

      player.once(AudioPlayerStatus.Idle, () => {
        log("✅ TERMINOU!");
        clearTimeout(timeout);
        stopAll();
        resolve(true);
      });

      player.on('error', (error) => {
        log(`❌ Player error: ${error.message}`);
        clearTimeout(timeout);
        stopAll();
        resolve(false);
      });

      connection.on('error', (error) => {
        log(`❌ Connection error: ${error.message}`);
        clearTimeout(timeout);
        stopAll();
        resolve(false);
      });
    });
  }

  // COMANDOS
  client.on("messageCreate", async (msg) => {
    if (msg.author.id !== OWNER_ID || msg.author.bot) return;
    
    const args = msg.content.trim().split(/\s+/);
    const cmd = args[0]?.toLowerCase();
    const arg = args[1];

    const channel = msg.guild.channels.cache.get(TARGET_VOICE_CHANNEL_ID);
    if (!channel?.isVoiceBased()) {
      return msg.reply("❌ **Canal de voz não encontrado**");
    }

    if (cmd === "!lista") {
      const sounds = getSounds();
      if (!sounds.length) {
        return msg.reply("❌ **Nenhum .ogg na pasta Sounds/**");
      }
      const names = sounds.map(s => path.parse(s).name);
      return msg.reply(`🎵 **${sounds.length} sons**:\n\`${names.join(' | ')}\``);

    } else if (cmd === "!tocar") {
      const sounds = getSounds();
      if (!sounds.length) return msg.reply("❌ **Nenhum som encontrado**");

      let soundPath;
      if (!arg || arg.toLowerCase() === "aleatorio") {
        soundPath = sounds[Math.floor(Math.random() * sounds.length)];
      } else {
        soundPath = sounds.find(s => path.parse(s).name === arg);
      }

      if (!soundPath) {
        return msg.reply(`❌ **${arg} não existe**\nUse \`!lista\``);
      }

      msg.reply(`🎵 **Preparando ${path.parse(soundPath).name}...**`);

      const success = await playInChannel(channel, soundPath);
      
      if (success) {
        msg.reply(`✅ **${path.parse(soundPath).name} tocou!** 🎉`);
      } else {
        msg.reply(`❌ **Falhou ao tocar ${path.parse(soundPath).name}**`);
      }

    } else if (cmd === "!parar") {
      stopAll();
      msg.reply("🛑 **Parado**");

    } else if (cmd === "!somtest") {
      const sounds = getSounds();
      if (!sounds.length) return msg.reply("❌ **Sem sons**");
      
      const soundPath = sounds[0]; // Primeiro som
      msg.reply(`🧪 **Testando ${path.parse(soundPath).name}...**`);
      
      const success = await playInChannel(channel, soundPath);
      msg.reply(success ? "✅ **Teste OK!**" : "❌ **Teste falhou**");
    }
  });

  // Ready
  client.once("ready", () => {
    log("🚀 Bot pronto!");
    const sounds = getSounds();
    log(`📁 Sons encontrados: ${sounds.length}`);
    if (sounds.length) {
      log(`🎵 Exemplo: ${getSounds()[0]}`);
    }
  });
};
