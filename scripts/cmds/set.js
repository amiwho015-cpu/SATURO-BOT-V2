const units = {
  k: 1e3,
  m: 1e6,
  b: 1e9,
  t: 1e12,
  q: 1e15,
  qt: 1e15,
  qi: 1e18
};

function parseAmount(input) {
  const match = String(input || "")
    .trim()
    .toLowerCase()
    .match(/^(-?\d+(?:\.\d+)?)([a-z]*)$/);
  if (!match) return NaN;
  const multiplier = match[2] ? units[match[2]] : 1;
  if (multiplier === undefined) return NaN;
  return Math.round(parseFloat(match[1]) * multiplier);
}

module.exports = {
  config: {
    name: "set",
    version: "1.3",
    author: "CRX Shihab",
    role: 0,
    shortDescription: {
      en: "Set coins and experience points for a user"
    },
    longDescription: {
      en: "Set coins and experience points for a user (reply, tag or UID supported). Supports K, M, B, T, QT"
    },
    category: "economy",
    guide: {
      en: "{pn}set [money|exp] [amount] (reply / @tag / uid) (e.g. 100K, 10B, 5QT)"
    }
  },

  onStart: async function ({ args, event, api, usersData }) {
    const permission = ["61590594545013"];
    if (!permission.includes(event.senderID)) {
      return api.sendMessage(
        "You don't have enough permission to use this command. Only My Lord Can Use It.",
        event.threadID,
        event.messageID
      );
    }

    const query = args[0];
    const amount = parseAmount(args[1]);

    if (!query || isNaN(amount)) {
      return api.sendMessage(
        "Invalid command arguments. Usage: set [money|exp] [amount] (e.g. 100K, 10B, 5QT)",
        event.threadID
      );
    }

    const { senderID, threadID } = event;

    if (senderID === api.getCurrentUserID()) return;

    let targetUser;
    const mentionIDs = Object.keys(event.mentions || {});
    const uidArg = args.slice(2).find(a => /^\d{8,}$/.test(a));

    if (event.type === "message_reply") {
      targetUser = event.messageReply.senderID;
    } else if (mentionIDs.length > 0) {
      targetUser = mentionIDs[0];
    } else if (uidArg) {
      targetUser = uidArg;
    } else {
      targetUser = senderID;
    }

    const userData = await usersData.get(targetUser);
    if (!userData) {
      return api.sendMessage("User not found.", threadID);
    }

    const name = await usersData.getName(targetUser);

    if (query.toLowerCase() === "exp") {
      await usersData.set(targetUser, {
        money: userData.money,
        exp: amount,
        data: userData.data
      });
      return api.sendMessage(`Set experience points to ${amount} for ${name}.`, threadID);
    } else if (query.toLowerCase() === "money") {
      await usersData.set(targetUser, {
        money: amount,
        exp: userData.exp,
        data: userData.data
      });
      return api.sendMessage(`Set coins to ${amount} for ${name}.`, threadID);
    } else {
      return api.sendMessage(
        "Invalid query. Use 'exp' to set experience points or 'money' to set coins.",
        threadID
      );
    }
  }
};
