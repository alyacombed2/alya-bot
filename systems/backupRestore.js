const fs = require('fs');
const axios = require('axios');
const path = require('path');
const archiver = require('archiver');

// delay
function sleep(ms) {
    return new Promise(res => setTimeout(res, ms));
}

async function backupServer(guild) {
    const basePath = `./backup-${guild.id}`;
    const channelsPath = `${basePath}/channels`;
    const filesPath = `${basePath}/files`;

    fs.mkdirSync(basePath, { recursive: true });
    fs.mkdirSync(channelsPath, { recursive: true });
    fs.mkdirSync(filesPath, { recursive: true });

    const serverData = [];

    for (const channel of guild.channels.cache.values()) {
        if (!channel.isTextBased()) continue;

        let allMessages = [];
        let lastId;

        while (true) {
            const options = { limit: 100 };
            if (lastId) options.before = lastId;

            const messages = await channel.messages.fetch(options);
            if (messages.size === 0) break;

            allMessages.push(...messages.values());
            lastId = messages.last().id;
        }

        const formatted = [];

        for (const msg of allMessages.reverse()) {
            let attachments = [];

            for (const att of msg.attachments.values()) {
                const fileName = `${Date.now()}-${att.name}`;
                const filePath = `${filesPath}/${fileName}`;

                try {
                    const response = await axios.get(att.url, { responseType: 'arraybuffer' });
                    fs.writeFileSync(filePath, response.data);
                    attachments.push(fileName);
                } catch {
                    attachments.push(att.url);
                }
            }

            formatted.push({
                author: msg.author.tag,
                content: msg.content,
                attachments
            });
        }

        fs.writeFileSync(`${channelsPath}/${channel.name}.json`, JSON.stringify(formatted, null, 2));

        serverData.push({
            name: channel.name,
            type: channel.type
        });
    }

    fs.writeFileSync(`${basePath}/server.json`, JSON.stringify(serverData, null, 2));

    console.log("📦 Backup completo feito!");
}

async function zipBackup(guildId) {
    return new Promise((resolve, reject) => {
        const output = fs.createWriteStream(`backup-${guildId}.zip`);
        const archive = archiver('zip');

        output.on('close', () => resolve(`backup-${guildId}.zip`));
        archive.on('error', err => reject(err));

        archive.pipe(output);
        archive.directory(`./backup-${guildId}`, false);
        archive.finalize();
    });
}

async function restoreServer(guild) {
    const basePath = `./backup-${guild.id}`;
    const channelsPath = `${basePath}/channels`;
    const filesPath = `${basePath}/files`;

    const serverData = JSON.parse(fs.readFileSync(`${basePath}/server.json`));

    console.log("🧹 Limpando servidor...");

    for (const channel of guild.channels.cache.values()) {
        await channel.delete().catch(() => {});
        await sleep(500);
    }

    console.log("📁 Restaurando canais...");

    for (const ch of serverData) {
        const newChannel = await guild.channels.create({
            name: ch.name,
            type: 0
        });

        await sleep(1000);

        const filePathJson = `${channelsPath}/${ch.name}.json`;
        if (!fs.existsSync(filePathJson)) continue;

        let messages = JSON.parse(fs.readFileSync(filePathJson));

        // 🔥 LIMITE PRA NÃO TRAVAR
        messages = messages.slice(0, 300);

        console.log(`📨 ${ch.name}: ${messages.length} mensagens`);

        for (const msg of messages) {
            let content = `**${msg.author}:** ${msg.content || ""}`;

            // 🔥 DIVIDE MENSAGEM GRANDE
            const parts = content.match(/[\s\S]{1,1900}/g) || [];

            for (const part of parts) {
                try {
                    if (msg.attachments.length > 0) {
                        for (const file of msg.attachments) {
                            const filePath = path.join(filesPath, file);

                            if (fs.existsSync(filePath)) {
                                await newChannel.send({
                                    content: part,
                                    files: [filePath]
                                });
                            } else {
                                await newChannel.send(part + "\n" + file);
                            }

                            await sleep(1200);
                        }
                    } else {
                        await newChannel.send(part);
                        await sleep(800);
                    }
                } catch (err) {
                    console.log("⚠️ Erro:", err.message);
                    await sleep(2000);
                }
            }
        }
    }

    console.log("✅ Restore completo!");
}

async function nukeComBackup(guild) {
    await backupServer(guild);
    await sleep(2000);

    for (const channel of guild.channels.cache.values()) {
        await channel.delete().catch(() => {});
    }

    for (let i = 1; i <= 10; i++) {
        await guild.channels.create({
            name: `coco-${i}`,
            type: 0
        });
    }

    console.log("💣 Nuke finalizado!");
}

module.exports = { backupServer, restoreServer, nukeComBackup, zipBackup };
