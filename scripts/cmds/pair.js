const axios = require("axios");
const fs = require("fs");
const path = require("path");

async function getApiBase() {
 try {
 const GITHUB_RAW = "https://raw.githubusercontent.com/Saim-x69x/sakura/main/ApiUrl.json";
 const res = await axios.get(GITHUB_RAW);
 return res.data.saimx69x;
 } catch (e) {
 console.error("GitHub raw fetch error:", e.message);
 return null;
 }
}

async function toFont(text, id = 21) {
 try {
 const apiBase = await getApiBase();
 if (!apiBase) return text;
 const apiUrl = `${apiBase}/api/font?id=${id}&text=${encodeURIComponent(text)}`;
 const { data } = await axios.get(apiUrl);
 return data.output || text;
 } catch (e) {
 console.error("Font API error:", e.message);
 return text;
 }
}

function avatarUrl(uid) {
 return `https://graph.facebook.com/${uid}/picture?width=720&height=720&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;
}

module.exports = {
 config: {
 name: "pair",
 aliases: ["pr"],
 author: "CRX Shihab",
 version: "2.1",
 role: 0,
 category: "love",
 shortDescription: { en: "💘 Generate a love match between you and another group member" },
 longDescription: { en: "This command calculates a love match based on gender. Male avatar is always on top and female avatar is always below." },
 guide: { en: "{p}{n} — Use this command in a group to find a love match" }
 },

 onStart: async function ({ api, event, usersData }) {
 try {
 const senderData = await usersData.get(event.senderID);
 const senderRawName = senderData.name;

 const threadData = await api.getThreadInfo(event.threadID);
 const users = threadData.userInfo;

 const myData = users.find(user => String(user.id) === String(event.senderID));
 if (!myData || !myData.gender) {
 return api.sendMessage("⚠️ Could not determine your gender. Please try again later.", event.threadID, event.messageID);
 }

 const myGender = String(myData.gender).toUpperCase();
 let matchCandidates = [];

 if (myGender === "MALE") {
 matchCandidates = users.filter(user => String(user.gender).toUpperCase() === "FEMALE" && String(user.id) !== String(event.senderID));
 } else if (myGender === "FEMALE") {
 matchCandidates = users.filter(user => String(user.gender).toUpperCase() === "MALE" && String(user.id) !== String(event.senderID));
 } else {
 return api.sendMessage("⚠️ Your gender is undefined. Cannot find a match. Please try again later.", event.threadID, event.messageID);
 }

 if (matchCandidates.length === 0) {
 return api.sendMessage("❌ No suitable match found in the group. Please try again later.", event.threadID, event.messageID);
 }

 const selectedMatch = matchCandidates[Math.floor(Math.random() * matchCandidates.length)];

 let maleId, maleRawName, femaleId, femaleRawName;

 if (myGender === "MALE") {
 maleId = event.senderID;
 maleRawName = senderRawName;
 femaleId = selectedMatch.id;
 femaleRawName = selectedMatch.name;
 } else {
 maleId = selectedMatch.id;
 maleRawName = selectedMatch.name;
 femaleId = event.senderID;
 femaleRawName = senderRawName;
 }

 const maleName = await toFont(maleRawName, 21);
 const femaleName = await toFont(femaleRawName, 21);

 const avatar1 = avatarUrl(maleId);
 const avatar2 = avatarUrl(femaleId);

 const apiBase = await getApiBase();
 if (!apiBase) {
 return api.sendMessage("❌ Failed to fetch API base. Please try again later.", event.threadID, event.messageID);
 }

 const apiUrl = `${apiBase}/api/pair?avatar1=${encodeURIComponent(avatar1)}&avatar2=${encodeURIComponent(avatar2)}`;
 const outputPath = path.join(__dirname, `pair_output_${event.senderID}_${Date.now()}.png`);

 const imageRes = await axios.get(apiUrl, { responseType: "arraybuffer" });
 fs.writeFileSync(outputPath, Buffer.from(imageRes.data, "binary"));

 const lovePercent = Math.floor(Math.random() * 31) + 70;

 const message = `💞 𝗠𝗮𝘁𝗰𝗵𝗺𝗮𝗸𝗶𝗻𝗴 𝗖𝗼𝗺𝗽𝗹𝗲𝘁𝗲 💞

🎀 ${maleName} ✨️
🎀 ${femaleName} ✨️

🕊️ 𝓓𝓮𝓼𝓽𝓲𝓷𝔂 𝓱𝓪𝓼 𝔀𝓻𝓲𝓽𝓽𝓮𝓷 𝔂𝓸𝓾𝓻 𝓷𝓪𝓶𝓮𝓼 𝓽𝓸𝓰𝓮𝓽𝓱𝓮𝓻 🌹 
𝓜𝓪𝔂 𝔂𝓸𝓾𝓻 𝓫𝓸𝓷𝓭 𝓵𝓪𝓼𝓽 𝓯𝓸𝓻𝓮𝓿𝓮𝓻 ✨️ 

💘 𝙲𝚘𝚖𝚙𝚊𝚝𝚒𝚋𝚒𝚕𝚒𝚝𝚢: ${lovePercent}% 💘`;

 api.sendMessage(
 { body: message, attachment: fs.createReadStream(outputPath) },
 event.threadID,
 () => {
 try { fs.unlinkSync(outputPath); } catch (e) {}
 },
 event.messageID
 );

 } catch (error) {
 console.error("Pair command error:", error.message);
 api.sendMessage("❌ An error occurred while trying to find a match. Please try again later.", event.threadID, event.messageID);
 }
 }
};
