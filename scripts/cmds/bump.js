const done = new Set();

module.exports = {
  config: {
    name: "bump",
    aliases: ["b"],
    version: "3.1",
    author: "CRX Shihab",
    countDown: 3,
    role: 0,
    category: "box chat",
    shortDescription: { en: "bump" },
    longDescription: { en: "bump" },
    guide: { en: "{pn}" }
  },

  run: async function ({ api, event }) {
    const { threadID, messageID, messageReply } = event;

    if (done.has(messageID)) return;
    done.add(messageID);
    setTimeout(() => done.delete(messageID), 60000);

    const send = (form, replyTo) =>
      new Promise(resolve => {
        api.sendMessage(form, threadID, (err, info) => resolve(info), replyTo);
      });

    if (!messageReply) {
      return send("Bump", messageID);
    }

    const target = messageReply.messageID;
    const body = messageReply.body || "";
    const list = messageReply.attachments || [];

    const sticker = list.find(a => a.type === "sticker");
    if (sticker && !body) {
      return send({ sticker: sticker.ID || sticker.stickerID }, target);
    }

    const files = [];
    for (const a of list) {
      if (a.type === "sticker" || !a.url) continue;
      try {
        const stream = await global.utils.getStreamFromURL(a.url);
        if (stream) files.push(stream);
      } catch (e) {}
    }

    if (!body && files.length === 0) {
      return send("Bump", target);
    }

    const form = {};
    if (body) form.body = body;
    if (files.length > 0) form.attachment = files;

    return send(form, target);
  },

  onStart: async function ({ api, event }) {
    return this.run({ api, event });
  },

  onChat: async function ({ api, event }) {
    if (!event.body) return;
    if (event.senderID === api.getCurrentUserID()) return;
    if (event.body.trim().toLowerCase() !== "bump") return;
    return this.run({ api, event });
  }
};
