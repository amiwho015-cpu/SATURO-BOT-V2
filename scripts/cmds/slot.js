module.exports = {
  config: {
    name: "slot",
    aliases: ["slots"],
    version: "8.0",
    author: "CRX Shihab",
    role: 0,
    countDown: 5,
    category: "GAMES",
    guide: {
      en: "{pn} <amount>"
    }
  },

  onStart: async ({ message, event, args, usersData, api }) => {
    const { senderID } = event;

    const MIN_BET = 100;
    const MAX_SPINS = 100;
    const RESET_TIME = 3600000;

    const CHANCE = { x4: 8, x3: 22, x2: 40, x1: 75 };

    const formatMoney = (num) => {
      const n = Number(num);
      if (n === Infinity || isNaN(n)) return "∞";
      if (n < 1000) return n.toFixed(0);
      const units = [
        { v: 1e12, s: "T" },
        { v: 1e9, s: "B" },
        { v: 1e6, s: "M" },
        { v: 1e3, s: "K" }
      ];
      for (let u of units) {
        if (n >= u.v)
          return (n / u.v).toFixed(2).replace(/\.00$/, "") + u.s;
      }
      return n.toLocaleString();
    };

    const parseAmount = (input) => {
      if (!input) return NaN;
      const a = input.toLowerCase();
      if (a.endsWith("k")) return parseFloat(a) * 1e3;
      if (a.endsWith("m")) return parseFloat(a) * 1e6;
      if (a.endsWith("b")) return parseFloat(a) * 1e9;
      if (a.endsWith("t")) return parseFloat(a) * 1e12;
      return parseInt(a);
    };

    const betAmount = parseAmount(args[0]);

    if (isNaN(betAmount) || betAmount < MIN_BET) {
      return message.reply(`🎰 Minimum bet is ${MIN_BET}$\nExample: /slot 1k`);
    }

    let userData = await usersData.get(senderID);
    if (!userData) userData = { money: 0 };
    const currentMoney = Number(userData.money || 0);

    if (betAmount > currentMoney) {
      return message.reply(`💸 Not enough balance!\nBalance: ${formatMoney(currentMoney)}$`);
    }

    if (!global.slotLimit) global.slotLimit = {};
    const now = Date.now();
    if (!global.slotLimit[senderID] || now - global.slotLimit[senderID].lastReset > RESET_TIME) {
      global.slotLimit[senderID] = { count: 0, lastReset: now };
    }

    if (global.slotLimit[senderID].count >= MAX_SPINS) {
      return message.reply(`‼️ Spin limit reached (${MAX_SPINS} spins)`);
    }

    const items = ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍"];
    const rand = () => items[Math.floor(Math.random() * items.length)];
    const shuffle = (arr) => arr.sort(() => Math.random() - 0.5);

    const pickOther = (used) => {
      const pool = items.filter((i) => !used.includes(i));
      return pool[Math.floor(Math.random() * pool.length)];
    };

    const roll = Math.random() * 100;
    let s;

    if (roll <= CHANCE.x4) {

      const a = rand();
      s = [a, a, a, a];
    } else if (roll <= CHANCE.x3) {

      const a = rand();
      const b = pickOther([a]);
      s = shuffle([a, a, a, b]);
    } else if (roll <= CHANCE.x2) {

      const a = rand();
      const b = pickOther([a]);
      s = shuffle([a, a, b, b]);
    } else if (roll <= CHANCE.x1) {

      const a = rand();
      const b = pickOther([a]);
      const c = pickOther([a, b]);
      s = shuffle([a, a, b, c]);
    } else {

      const pool = shuffle([...items]);
      s = pool.slice(0, 4);
    }

    const counts = {};
    s.forEach((i) => (counts[i] = (counts[i] || 0) + 1));
    const sorted = Object.values(counts).sort((a, b) => b - a);

    let multiplier = 0;
    if (sorted[0] === 4) multiplier = 4;
    else if (sorted[0] === 3) multiplier = 3;
    else if (sorted[0] === 2 && sorted[1] === 2) multiplier = 2;
    else if (sorted[0] === 2) multiplier = 1;

    const win = multiplier > 0;

    global.slotLimit[senderID].count++;

    const line = "──────────────";
    const frame = (a, b, c, d, footer) =>
      `🎰 | SLOT MACHINE | 🎰\n${line}\n [ ${a} | ${b} | ${c} | ${d} ]\n${line}\n${footer}`;

    const sent = await message.reply(frame("❓", "❓", "❓", "❓", "⌛ Spinning..."));

    await new Promise((r) => setTimeout(r, 1000));
    await api.editMessage(frame(s[0], s[1], "❓", "❓", "⌛ Spinning..."), sent.messageID);

    await new Promise((r) => setTimeout(r, 1000));
    await api.editMessage(frame(s[0], s[1], s[2], "❓", "⌛ Spinning..."), sent.messageID);

    await new Promise((r) => setTimeout(r, 800));

    const bonus = win ? betAmount * multiplier : 0;
    const finalMoney = win ? currentMoney + bonus : currentMoney - betAmount;

    userData.money = finalMoney;
    await usersData.set(senderID, userData);

    const status = win ? `WIN ${multiplier}x 🎉` : "LOSE ❤️‍🩹";
    const footer =
      `🎉 ${status}\n` +
      `💰 ${win ? "Won: " + formatMoney(bonus) : "Lost: " + formatMoney(betAmount)}$\n` +
      `👛 Balance: ${formatMoney(finalMoney)}$\n` +
      `📜 Usage: ${global.slotLimit[senderID].count}/${MAX_SPINS}`;

    await api.editMessage(frame(s[0], s[1], s[2], s[3], footer), sent.messageID);
  }
};
