const fs = require("fs");
const path = require("path");
const prism = require("prism-media");
const ffmpegStatic = require('ffmpeg-static');

const { joinVoiceChannel, createAudioPlayer, createAudioResource, 
        AudioPlayerStatus, NoSubscriberBehavior, VoiceConnectionStatus, 
        entersState, StreamType } = require("@discordjs/voice");

module.exports = (client) => {
  const SOUND_FOLDER = path.join(__dirname, "Sounds");
  const OWNER_ID = "1372615579407618209";

  let currentConnection = null;
  let currentPlayer = null;
  let isPlaying = false;

  function log(msg) {
    console.log(`[🎵] ${new Date().toLocaleTimeString()} ${msg}`);
  }

  function getSounds() {
    try {
      return fs.readdirSync(SOUND_FOLDER)
        .filter(f => f.endsWith('.ogg'))
        .map(f => path.join(SOUND_FOLDER, f));
    } catch {
      return [];
    }
  }

  function cleanup() {
    currentPlayer?.stop(true);
    currentConnection?.destroy();
    currentPlayer = null;
    currentConnection = null;
    isPlaying = false;
  }

  // 🎵 FFmpeg PERFEITO para .ogg
  function createPerfectResource(soundPath) {
    log(`🔧 ${path.basename(soundPath)}`);
    
    const process = new prism.FFmpeg({
      path: ffmpegStatic,
      args: [
        '-ss', '0',           // Sem delay
        '-i', soundPath,      // Input
        '-f', 's16le',        // Formato raw
        '-ar', '48000',       // Sample rate Discord
        '-ac', '2',           // Stereo
        '-vn',                // Sem vídeo
        '-loglevel', 'quiet'  // Silêncio
      ]
    });

    return createAudioResource(process, {
      inputType: StreamType.Raw,
      inlineVolume: true
    });
  }

  async function playSound(channel, soundPath) {
    if (isPlaying) throw new Error("Já tocando");

    isPlaying = true;
    
    // Conexão
    currentConnection = joinVoiceChannel({
      channelId: channel.id,
      guildId: channel.guild.id,
      adapterCreator: channel.guild.voiceAdapterCreator,
    });

    await entersState(currentConnection, VoiceConnectionStatus.Ready, 30000);

    // Player
    currentPlayer = createAudioPlayer({
      behaviors: { noSubscriber: NoSubscriberBehavior.Play }
    });

    currentConnection.subscribe(currentPlayer);

    // 🔥 RESOURCE PERFEITO
    const resource = createPerfectResource(soundPath);
    resource.volume.setVolume(1.0);
    
    currentPlayer.play(resource);

    log("▶️ TOCANDO!");

    // Cleanup automático
    return new Promise(resolve => {
      const onIdle = () => {
        log("✅ ACABOU");
        cleanup();
        resolve(true);
      };

      currentPlayer.once(AudioPlayerStatus.Idle, onIdle);
      
      // Fallback 60s
      setTimeout(() => {
        log("⏰ FIM FORÇADO");
        currentPlayer.removeListener(AudioPlayerStatus.Idle, onIdle);
        cleanup();
        resolve(false);
      }, 60000);
    });
  }

  // 👑 COMANDOS
  client.on("messageCreate", async msg => {
    if (msg.author.id !== OWNER_ID || msg.author.bot) return;
    
    const args = msg.content.trim().split(/\s+/);
    const cmd = args[0]?.toLowerCase();
    const arg = args[1];

    const channel = msg.member?.voice.channel || 
                   msg.guild.channels.cache.get("1476321416470335659");

    if (!channel?.isVoiceBased()) {
      return msg.reply("❌ **Entre em uma call primeiro**");
    }

    // !lista
    if (cmd === "!lista") {
      const sounds = getSounds();
      const names = sounds.map(s => path.parse(s).name);
      msg.reply(`🎵 **${names.length} sons**:\n\`${names.join(', ')}\``);
      return;
    }

    // !tocar
    if (cmd === "!tocar") {
      const sounds = getSounds();
      if (!sounds.length) return msg.reply("❌ **Sem sons na pasta**");

      let sound;
      if (arg?.toLowerCase() === "aleatorio") {
        sound = sounds[Math.floor(Math.random() * sounds.length)];
      } else {
        sound = sounds.find(s => path.parse(s).name === arg);
      }

      if (!sound) {
        return msg.reply(`❌ **${arg || 'aleatorio'} inválido**\n\`!lista\` pra ver`);
      }

      msg.reply(`🎶 **${path.parse(sound).name}** carregando...`);

      const success = await playSound(channel, sound);
      
      msg.reply(success ? 
        `✅ **${path.parse(sound).name} tocou!** 🎉` : 
        `❌ **Falhou**`
      );
      return;
    }

    // !parar
    if (cmd === "!parar") {
      cleanup();
      msg.reply("🛑 **Parado**");
      return;
    }
  });

  client.once("ready", () => {
    log("✅ ONLINE");
    log(`📁 ${getSounds().length} sons .ogg`);
  });
};
