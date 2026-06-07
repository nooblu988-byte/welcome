const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

dotenv.config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
});

const PREFIX = process.env.PREFIX || '!';
const dataFile = path.join(__dirname, 'welcome-settings.json');

// Load welcome settings
function loadSettings() {
  if (fs.existsSync(dataFile)) {
    return JSON.parse(fs.readFileSync(dataFile, 'utf8'));
  }
  return {};
}

// Save welcome settings
function saveSettings(settings) {
  fs.writeFileSync(dataFile, JSON.stringify(settings, null, 2), 'utf8');
}

let welcomeSettings = loadSettings();

// Bot ready event
client.on('clientReady', () => {
  console.log(`✅ Bot logged in as ${client.user.tag}`);
  client.user.setActivity('members joining', { type: 'WATCHING' });
});

// Welcome message when member joins
client.on('guildMemberAdd', (member) => {
  const guildId = member.guild.id;
  const settings = welcomeSettings[guildId] || {
    enabled: true,
    title: 'Welcome to the Server!',
    description: `Welcome ${member.user.username}! 👋\n\nWe're glad to have you here.`,
    color: '#0099ff',
    imageUrl: null,
  };

  if (!settings.enabled) return;

  const welcomeEmbed = new EmbedBuilder()
    .setColor(settings.color)
    .setTitle(settings.title)
    .setDescription(settings.description.replace('{user}', member.user.username).replace('{server}', member.guild.name))
    .addFields(
      { name: 'Member Count', value: `You are member #${member.guild.memberCount}`, inline: true },
      { name: 'Server', value: member.guild.name, inline: true }
    )
    .setFooter({ text: `Joined at ${member.joinedAt.toDateString()}` })
    .setTimestamp();

  if (settings.imageUrl) {
    welcomeEmbed.setImage(settings.imageUrl);
  }

  welcomeEmbed.setThumbnail(member.user.displayAvatarURL({ dynamic: true }));

  // Find welcome channel
  const welcomeChannel = member.guild.channels.cache.find(
    (ch) => ch.name === 'welcome' && ch.isTextBased()
  );

  if (welcomeChannel) {
    welcomeChannel.send({ embeds: [welcomeEmbed] });
  } else {
    member.send({ embeds: [welcomeEmbed] }).catch(() => {
      console.log(`Could not send DM to ${member.user.tag}`);
    });
  }
});

// Message command handler
client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  // Welcome setup command
  if (command === 'welcomeset') {
    if (!message.member.permissions.has('ManageGuild')) {
      return message.reply('❌ You need to have "Manage Server" permission!');
    }

    const modal = new ModalBuilder()
      .setCustomId('welcome_modal')
      .setTitle('Setup Welcome Message');

    const titleInput = new TextInputBuilder()
      .setCustomId('welcome_title')
      .setLabel('Title')
      .setStyle(TextInputStyle.Short)
      .setMaxLength(256)
      .setValue(welcomeSettings[message.guildId]?.title || 'Welcome!')
      .setRequired(true);

    const descInput = new TextInputBuilder()
      .setCustomId('welcome_desc')
      .setLabel('Message ({user}, {server})')
      .setStyle(TextInputStyle.Paragraph)
      .setMaxLength(4000)
      .setValue(welcomeSettings[message.guildId]?.description || 'Welcome {user}!')
      .setRequired(true);

    const colorInput = new TextInputBuilder()
      .setCustomId('welcome_color')
      .setLabel('Color (#0099ff)')
      .setStyle(TextInputStyle.Short)
      .setMaxLength(7)
      .setValue(welcomeSettings[message.guildId]?.color || '#0099ff')
      .setRequired(true);

    const imageInput = new TextInputBuilder()
      .setCustomId('welcome_image')
      .setLabel('Image URL')
      .setStyle(TextInputStyle.Short)
      .setMaxLength(500)
      .setValue(welcomeSettings[message.guildId]?.imageUrl || '')
      .setRequired(false);

    modal.addComponents(
      new ActionRowBuilder().addComponents(titleInput),
      new ActionRowBuilder().addComponents(descInput),
      new ActionRowBuilder().addComponents(colorInput),
      new ActionRowBuilder().addComponents(imageInput)
    );

    await message.showModal(modal);
  }

  // Welcome preview
  if (command === 'welcomepreview') {
    const guildId = message.guildId;
    const settings = welcomeSettings[guildId] || {
      title: 'Welcome!',
      description: `Welcome {user}!`,
      color: '#0099ff',
      imageUrl: null,
    };

    const previewEmbed = new EmbedBuilder()
      .setColor(settings.color)
      .setTitle(settings.title)
      .setDescription(settings.description.replace('{user}', message.author.username).replace('{server}', message.guild.name))
      .addFields(
        { name: 'Member Count', value: `You are member #${message.guild.memberCount}`, inline: true },
        { name: 'Server', value: message.guild.name, inline: true }
      )
      .setFooter({ text: `Joined at ${new Date().toDateString()}` })
      .setTimestamp();

    if (settings.imageUrl) {
      previewEmbed.setImage(settings.imageUrl);
    }

    previewEmbed.setThumbnail(message.author.displayAvatarURL({ dynamic: true }));

    message.reply({ embeds: [previewEmbed] });
  }

  // Toggle welcome
  if (command === 'welcometoggle') {
    if (!message.member.permissions.has('ManageGuild')) {
      return message.reply('❌ You need to have "Manage Server" permission!');
    }

    const guildId = message.guildId;
    if (!welcomeSettings[guildId]) {
      welcomeSettings[guildId] = {
        enabled: true,
        title: 'Welcome!',
        description: 'Welcome {user}!',
        color: '#0099ff',
        imageUrl: null,
      };
    }

    welcomeSettings[guildId].enabled = !welcomeSettings[guildId].enabled;
    saveSettings(welcomeSettings);

    message.reply(`✅ Welcome messages are now ${welcomeSettings[guildId].enabled ? '**enabled**' : '**disabled**'}!`);
  }

  // Help command
  if (command === 'help') {
    const helpEmbed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('📚 Bot Commands')
      .addFields(
        { name: `${PREFIX}welcomeset`, value: 'Setup welcome message', inline: false },
        { name: `${PREFIX}welcomepreview`, value: 'Preview welcome message', inline: false },
        { name: `${PREFIX}welcometoggle`, value: 'Enable/disable welcome', inline: false },
        { name: `${PREFIX}help`, value: 'Show this message', inline: false }
      )
      .setTimestamp();

    message.reply({ embeds: [helpEmbed] });
  }

  // Ping command
  if (command === 'ping') {
    message.reply(`🏓 Pong! Latency is ${message.client.ws.ping}ms.`);
  }
});

// Handle modal submissions
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isModalSubmit()) return;

  if (interaction.customId === 'welcome_modal') {
    const title = interaction.fields.getTextInputValue('welcome_title');
    const description = interaction.fields.getTextInputValue('welcome_desc');
    const color = interaction.fields.getTextInputValue('welcome_color');
    const imageUrl = interaction.fields.getTextInputValue('welcome_image') || null;

    const guildId = interaction.guildId;

    // Validate hex color
    const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    if (!hexRegex.test(color)) {
      return interaction.reply({ content: '❌ Invalid color! Use format like #0099ff', ephemeral: true });
    }

    // Validate image URL
    if (imageUrl && !imageUrl.match(/^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i)) {
      return interaction.reply({ content: '❌ Invalid image URL! Must be a direct image link.', ephemeral: true });
    }

    welcomeSettings[guildId] = {
      enabled: true,
      title,
      description,
      color,
      imageUrl,
    };

    saveSettings(welcomeSettings);

    interaction.reply({
      content: '✅ Welcome settings saved!',
      ephemeral: true,
    });
  }
});

// Login with token
client.login(process.env.TOKEN);
