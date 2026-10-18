const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

const API_CONFIG_URL = "https://raw.githubusercontent.com/goatbotnx/xalmanx210/refs/heads/main/apis.json";
const API_KEY = "xalman-hub";
let apiBaseUrl = null;
let apiConfigRequest = null;

async function getApiBaseUrl() {
  if (apiBaseUrl) return apiBaseUrl;

  if (!apiConfigRequest) {
    apiConfigRequest = axios
      .get(API_CONFIG_URL, { timeout: 15000 })
      .then(({ data }) => {
        const baseUrl = data?.[API_KEY];

        if (typeof baseUrl !== "string" || !baseUrl.trim()) {
          throw new Error(`Missing API key in apis.json: ${API_KEY}`);
        }

        apiBaseUrl = baseUrl.replace(/\/+$/, "");
        return apiBaseUrl;
      })
      .finally(() => {
        apiConfigRequest = null;
      });
  }

  return apiConfigRequest;
}

const RATIOS = {
  "1:1": "1:1",
  "16:9": "16:9",
  "9:16": "9:16",
  "4:3": "4:3",
  "3:4": "3:4"
};

const MODELS = [
  { id: 1, name: "Flux 2 Max", tag: "🔥", path: "/api/flux2max", supportsImage: true },
  { id: 2, name: "GPT Image 2", tag: "🧠", path: "/api/gptimage2", supportsImage: true },
  { id: 3, name: "GPT 2.5 Flare", tag: "✨", path: "/api/gpt2.5-flare", supportsImage: true },
  { id: 4, name: "GPT 2.5 Sunburst", tag: "🌅", path: "/api/gpt2.5-sunburst", supportsImage: true },
  { id: 5, name: "Grok", tag: "⚡", path: "/api/grok", supportsImage: true },
  { id: 6, name: "Nano Banana", tag: "🍌", path: "/api/nb", supportsImage: true },
  { id: 7, name: "Nano Banana 2", tag: "🍌", path: "/nanobanana2", supportsImage: true },
  { id: 8, name: "Qwen Image 2", tag: "🌀", path: "/qwenimage2", supportsImage: true },
  { id: 9, name: "Qwen Image", tag: "🌀", path: "/qwen-image", supportsImage: false },
  { id: 10, name: "SeedDream 4", tag: "🌱", path: "/seedream4", supportsImage: true }
];

function buildModelBox() {
  const rows = MODELS.map(m => `│ ${String(m.id).padStart(2, "0")}. ${m.tag} ${m.name}`);
  return (
    "╭─〔 🤖 𝐀𝐕𝐀𝐈𝐋𝐀𝐁𝐋𝐄 𝐌𝐎𝐃𝐄𝐋𝐒 〕─╮\n" +
    rows.join("\n") +
    "\n╰─────────────────────╯"
  );
}

module.exports = {
  config: {
    name: "genx",
    aliases: ["gnx"],
    version: "2.0.0",
    author: "CRX Shihab",
    countDown: 15,
    role: 0,
    shortDescription: { en: "Generate or edit images with 10 AI models" },
    longDescription: { en: "Text-to-image or image-edit generation using multiple AI models" },
    category: "ai",
    guide: {
      en:
        "   {pn} --m <1-10> <prompt> --ar <ratio>\n" +
        "   Reply to an image + {pn} --m <1-10> <prompt> → edit that image\n\n" +
        buildModelBox() +
        "\n\n📐 Ratios: " + Object.keys(RATIOS).join(", ")
    }
  },

  onStart: async function ({ api, event, args, message, prefix, commandName }) {
    const { messageID } = event;
    const cacheDir = path.join(__dirname, "cache");
    await fs.ensureDir(cacheDir);

    if (!args.length) {
      return message.reply(
        `╭─〔 🤖 𝐆𝐄𝐍𝐗 𝐈𝐌𝐀𝐆𝐄 𝐀𝐈 〕─╮\n` +
        `│ 📝 ${prefix}${commandName} --m <1-10> <prompt> --ar <ratio>\n` +
        `│ 🖼️ Reply to an image + command → edit mode\n` +
        `╰─────────────────────╯\n\n` +
        buildModelBox() +
        `\n\n📐 Ratios: ${Object.keys(RATIOS).join(", ")}`
      );
    }

    let workingArgs = [...args];

    const mIndex = workingArgs.findIndex(a => a.toLowerCase() === "--m");
    let modelId = null;
    if (mIndex !== -1) {
      modelId = parseInt(workingArgs[mIndex + 1]);
      workingArgs = [...workingArgs.slice(0, mIndex), ...workingArgs.slice(mIndex + 2)];
    }

    const model = MODELS.find(m => m.id === modelId);
    if (!model) {
      return message.reply(
        `❌ Please choose a valid model with --m <1-10>.\n\n${buildModelBox()}`
      );
    }

    const arIndex = workingArgs.findIndex(a => a.toLowerCase() === "--ar");
    let ratio = "1:1";
    if (arIndex !== -1) {
      const ratioArg = workingArgs[arIndex + 1];
      if (ratioArg && RATIOS[ratioArg]) ratio = RATIOS[ratioArg];
      workingArgs = [...workingArgs.slice(0, arIndex), ...workingArgs.slice(arIndex + 2)];
    }

    const prompt = workingArgs.join(" ").trim();
    if (!prompt) return message.reply("❌ Please provide a prompt.");

    const imageUrl = event.messageReply?.attachments?.find(a => a.type === "photo")?.url || null;
    const isEdit = Boolean(imageUrl && model.supportsImage);

    api.setMessageReaction("⏳", messageID, () => {}, true);

    let filePath;

    try {
      const baseUrl = await getApiBaseUrl();
      const endpoint = `${baseUrl}${model.path}`;

      const params = { prompt, ratio };
      if (isEdit) params.image = imageUrl;

      const res = await axios.get(endpoint, {
        params,
        timeout: 120000,
        responseType: "arraybuffer",
        validateStatus: () => true
      });

      const contentType = res.headers["content-type"] || "";
      const buffer = Buffer.from(res.data);
      const looksLikeJson = contentType.includes("json") || contentType.includes("text");

      if (looksLikeJson) {
        let errMsg = "Unknown error.";
        try {
          const errData = JSON.parse(buffer.toString("utf-8"));
          errMsg = errData?.message || errMsg;
        } catch {}
        api.setMessageReaction("❌", messageID, () => {}, true);
        return message.reply(`❌ ${model.name} failed: ${errMsg}`);
      }

      const isPng = buffer.slice(0, 8).toString("hex") === "89504e470d0a1a0a";
      const ext = contentType.includes("png") || isPng ? "png" : "jpg";
      filePath = path.join(cacheDir, `genx_${Date.now()}.${ext}`);
      await fs.writeFile(filePath, buffer);

      api.setMessageReaction("✅", messageID, () => {}, true);

      return message.reply({
        body:
          `╭─〔 🤖 𝐆𝐄𝐍𝐗 𝐑𝐄𝐒𝐔𝐋𝐓 〕─╮\n` +
          `│ ${model.tag} 𝐌𝐨𝐝𝐞𝐥   ─> ${model.name}\n` +
          `│ 📐 𝐑𝐚𝐭𝐢𝐨   ─> 「 ${ratio} 」\n` +
          `│ 🎭 𝐌𝐨𝐝𝐞    ─> 『 ${isEdit ? "Edit" : "Text-to-Image"} 』\n` +
          `╰----------------------------─╯`,
        attachment: fs.createReadStream(filePath)
      });
    } catch (err) {
      console.error("[genx] Error:", err.message);
      api.setMessageReaction("❌", messageID, () => {}, true);
      return message.reply(`❌ ${model.name} failed: ${err.message}`);
    } finally {
      if (filePath) fs.remove(filePath).catch(() => {});
    }
  }
};
