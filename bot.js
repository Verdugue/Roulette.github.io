// backend.js
const { Client, GatewayIntentBits, Partials, EmbedBuilder } = require("discord.js");
const express = require("express");
const cors = require("cors");
require("dotenv").config();

// ----------------------
// CONFIG
// ----------------------
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

const GUILD_ID = process.env.GUILD_ID;
const VOICE_CHANNEL_ID = process.env.VOICE_CHANNEL_ID;
const VOICE_CHANNEL_TEAM_1 = process.env.VOICE_CHANNEL_TEAM_1;
const VOICE_CHANNEL_TEAM_2 = process.env.VOICE_CHANNEL_TEAM_2;
const TEXT_CHANNEL_ID = process.env.TEXT_CHANNEL_ID; // canal texte pour envoyer le message
const PORT = process.env.PORT || 3000;

// ----------------------
// EXPRESS
// ----------------------
const app = express();
app.use(cors());
app.use(express.json());

client.once("ready", () => {
  console.log(`✅ Connecté en tant que ${client.user.tag}`);
});

// ----------------------
// UTILS
// ----------------------
function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function splitIntoTeams(names, teamCount = 2) {
  const teams = Array.from({ length: teamCount }, () => []);
  const shuffled = shuffle(names);
  shuffled.forEach((name, i) => {
    teams[i % teamCount].push(name);
  });
  return teams;
}

// ----------------------
// API
// ----------------------
app.get("/getVoiceMembers", async (req, res) => {
  try {
    const guild = await client.guilds.fetch(GUILD_ID);
    await guild.channels.fetch();
    const channel = guild.channels.cache.get(VOICE_CHANNEL_ID);
    if (!channel || !channel.isVoiceBased()) return res.json({ members: [] });

    const members = channel.members.map((m) => m.displayName);
    res.json({ members });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Impossible de récupérer les membres" });
  }
});

app.post("/createTeams", async (req, res) => {
  try {
    const { exceptions = [] } = req.body;

    const guild = await client.guilds.fetch(GUILD_ID);
    await guild.channels.fetch();
    const voiceChannel = guild.channels.cache.get(VOICE_CHANNEL_ID);
    if (!voiceChannel) return res.status(400).json({ error: "Vocal non trouvé" });

    const members = voiceChannel.members.map((m) => m);
    if (members.length < 2) return res.status(400).json({ error: "Pas assez de membres" });

    const names = members.map((m) => m.displayName);
    const teams = splitIntoTeams(names, 2);

    const embed = new EmbedBuilder()
      .setTitle("🎲 Équipes créées !")
      .setColor(0x5865f2)
      .addFields(
        { name: "Équipe 1", value: teams[0].map((n) => `🔸 ${n}`).join("\n") || "—", inline: false },
        { name: "Équipe 2", value: teams[1].map((n) => `🔸 ${n}`).join("\n") || "—", inline: false }
      );

    const textChannel = guild.channels.cache.get(TEXT_CHANNEL_ID);
    if (!textChannel || !textChannel.isTextBased()) return res.status(400).json({ error: "Canal texte invalide" });

    const message = await textChannel.send({ embeds: [embed] });

    // UNE SEULE RÉACTION
    await message.react("🔹");

    // Map memberId -> channelId
    message.teamMap = {};
    members.forEach((m) => {
      if (teams[0].includes(m.displayName)) message.teamMap[m.id] = VOICE_CHANNEL_TEAM_1;
      else if (teams[1].includes(m.displayName)) message.teamMap[m.id] = VOICE_CHANNEL_TEAM_2;
    });

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Impossible de créer les équipes" });
  }
});

// ----------------------
// REACTIONS (UNE SEULE)
client.on("messageReactionAdd", async (reaction, user) => {
  if (user.bot) return;
  if (reaction.partial) await reaction.fetch();

  const member = reaction.message.guild.members.cache.get(user.id);
  if (!member?.voice?.channel) return;

  const channelId = reaction.message.teamMap?.[member.id];
  if (!channelId) return;

  // Peu importe la réaction, on déplace le joueur vers son vocal d'équipe
  const channel = reaction.message.guild.channels.cache.get(channelId);
  if (channel) await member.voice.setChannel(channel);
});

// ----------------------
// START
app.listen(PORT, () => console.log(`🌍 API en ligne sur http://localhost:${PORT}`));
client.login(process.env.BOT_TOKEN);
