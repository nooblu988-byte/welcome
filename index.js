const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const dotenv = require('dotenv');

dotenv.config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const PREFIX = process.env.PREFIX || '!';

// Bot ready event
client.on('ready', () => {
  console.log(`✅ Bot logged in as ${client.user.tag}`);
  client.user.setActivity('your server', { type: 'WATCHING' });
});

// Welcome message when member joins
client.on('guildMemberAdd', (member) => {
  const welcomeEmbed = new EmbedBuilder()
    .setColor('#0099ff')
    .setTitle('Welcome to the Server!')
    .setDescription(`Welcome ${member.user.username}! 👋\n\nWe're glad to have you here. Please check the rules and have fun!`)
    .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
    .addFields(
      { name: 'Member Count', value: `You are member #${member.guild.memberCount}`, inline: true },
      { name: 'Server', value: member.guild.name, inline: true }
    )
    .setFooter({ text: `Joined at ${member.joinedAt.toDateString()}` })
    .setTimestamp();

  // Send to a welcome channel (if it exists)
  const welcomeChannel = member.guild.channels.cache.find(
    (ch) => ch.name === 'welcome' && ch.isTextBased()
  );

  if (welcomeChannel) {
    welcomeChannel.send({ embeds: [welcomeEmbed] });
  } else {
    // Send DM if no welcome channel
    member.send({ embeds: [welcomeEmbed] }).catch(() => {
      console.log(`Could not send DM to ${member.user.tag}`);
    });
  }
});

// Message command handler
client.on('messageCreate', (message) => {
  if (message.author.bot || !message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  // Welcome command
  if (command === 'welcome') {
    const welcomeEmbed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('Welcome Command')
      .setDescription('This is the welcome message for this server!')
      .setTimestamp();

    message.reply({ embeds: [welcomeEmbed] });
  }

  // Ping command
  if (command === 'ping') {
    message.reply(`🏓 Pong! Latency is ${message.client.ws.ping}ms.`);
  }

  // Help command
  if (command === 'help') {
    const helpEmbed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('Bot Commands')
      .addFields(
        { name: `${PREFIX}welcome`, value: 'Shows a welcome message' },
        { name: `${PREFIX}ping`, value: 'Shows bot latency' },
        { name: `${PREFIX}help`, value: 'Shows this message' }
      )
      .setTimestamp();

    message.reply({ embeds: [helpEmbed] });
  }
});

// Login with token
client.login(process.env.TOKEN);
