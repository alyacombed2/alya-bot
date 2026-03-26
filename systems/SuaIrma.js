const fs = require("fs");
const path = require("path");
const prism = require("prism-media");
const ffmpegStatic = require('ffmpeg-static');

const { 
  joinVoiceChannel, 
  createAudioPlayer, 
  createAudioResource, 
  AudioPlayerStatus, 
  VoiceConnectionStatus, 
  entersState, 
  StreamType,
  NoSubscriberBehavior
} = require("@discordjs/voice");

module.exports = (client) => {
  const SOUNDS_PATH = path.join(__dirname, "Sounds");
  const OWNER_ID = "1372615579407618209";

  let connection = null;
  let player = null;
  let isBusy = false;

  console.log("[🎵] 🔄 Inicializando sistema de sons...");

  // Lista sons
  function listSounds() {
    try {
      const files = fs.readdirSync(SOUNDS_PATH).filter(f => f.endsWith('.ogg'));
      console.log(`[🎵] 📁 ${files.length} sons encontrados`);
      return files;
    } catch (e) {
      console.log("[🎵] ❌ Pasta Sounds não encontrada");
      return [];
    }
  }

  // Para tudo
  function stopAll() {
    if (player) player.stop(true);
    if (connection) connection.destroy();
    player = connection = null;
    isBusy = false;
    console.log("[🎵] 🛑 Parado");
  }

  // Cria áudio com FFmpeg
  function createAudio(file) {
    const filePath = path.join(SOUNDS_PATH, file);
    console.log(`[🎵] 🎧 Processando ${file}`);
    
    const ffmpegArgs = [
      '-i', filePath,
      '-f', 's16le',
      '-ar', '48000',
      '-ac', '2',
      '-loglevel', 'quiet'
    ];

    const ffmpegProcess = new prism.FFmpeg({
      path: ffmpegStatic,
      args: ffmpegArgs
    });

    const resource = createAudioResource(ffmpegProcess, {
      inputType: StreamType.Raw,
      inlineVolume: true
    });

    resource.volume.setVolume(1.0);
    return resource;
  }

  // Toca som
  async function playSound(voiceChannel, filename) {
    if (isBusy) return false;

    isBusy = true;
    stopAll();

    try {
      console.log(`[🎵] 🔗 Conectando ${voiceChannel.name}`);
      
      connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: voiceChannel.guild.id,
        adapterCreator: voiceChannel.guild.voiceAdapterCreator,
      });

      await entersState(connection, VoiceConnectionStatus.Ready, 15000);
      console.log("[🎵] ✅ Conectado");

      player = createAudioPlayer({
        behaviors: {
          noSubscriber: NoSubscriberBehavior.Play
        }
      });

      connection.subscribe(player);

      const resource = createAudio(filename);
      player.play(resource);

      console.log(`[🎵] ▶️ TOCANDO ${filename}`);

      // Espera acabar
      await new Promise((resolve) => {
        const finish = () => {
          player.off('stateChange', onStateChange);
          resolve();
        };

        const onStateChange = (oldState, newState) => {
          if (newState.status === AudioPlayerStatus.Idle) {
            console.log(`[🎵] ✅ ${filename} finalizado`);
            finish();
          }
        };

        player.on('stateChange', onStateChange);
        
        // Timeout segurança
        setTimeout(finish, 60000);
      });

      stopAll();
      return true;

    } catch (error) {
      console.log(`[🎵] ❌ Erro: ${error.message}`);
      stopAll();
      return false;
    }
  }

  // Comandos
  client.on('messageCreate', async (msg) => {
    if (msg.author.id !== OWNER_ID || msg.author.bot) return;

    const args = msg.content.trim().split(/\s+/);
    const command = args[0].toLowerCase();
    const param = args[1];

    const voiceChannel = msg.member?.voice?.channel;
    if (!voiceChannel && command !== '!lista') {
      return msg.reply('❌ **Você precisa estar em uma call**');
    }

    const sounds = listSounds();

    if (command === '!lista') {
      if (sounds.length === 0) {
        return msg.reply('❌ **Nenhum arquivo .ogg na pasta `Sounds/`**');
      }
      const soundNames = sounds.map(f => f.replace('.ogg', '')).join(', ');
      msg.reply(`🎵 **${sounds.length} sons**:\n\`${soundNames}\``);
    }

    else if (command === '!tocar') {
      if (sounds.length === 0) {
        return msg.reply('❌ **Sem sons disponíveis**');
      }

      let selectedSound;
      if (!param || param.toLowerCase() === 'aleatorio' || param === 'r') {
        selectedSound = sounds[Math.floor(Math.random() * sounds.length)];
      } else {
        selectedSound = sounds.find(f => f.replace('.ogg', '') === param);
      }

      if (!selectedSound) {
        return msg.reply(`❌ **${param}** não encontrado\nUse \`!lista\``);
      }

      msg.reply(`🎶 **Carregando ${selectedSound.replace('.ogg', '')}...**`);

      const success = await playSound(voiceChannel, selectedSound);
      msg.reply(success ? 
        `✅ **${selectedSound.replace('.ogg', '')} tocou!** 🎉` : 
        '❌ **Erro ao tocar**');
    }

    else if (command === '!parar') {
      stopAll();
      msg.reply('🛑 **Parado**');
    }
  });

  // Inicialização
  client.once('ready', () => {
    listSounds();
    console.log("[🎵] ✅ Sistema de sons ativo!");
  });
};
