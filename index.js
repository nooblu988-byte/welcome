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
    title: '👋 Welcome!',
    description: 'Welcome to our server!',
    color: '#0099ff',
    bannerUrl: null,
    buttons: [
      { label: 'Read Rules', emoji: '📖', url: '', channelId: '' },
      { label: 'Intro Channel', emoji: '👤', url: '', channelId: '' },
    ],
  };

  if (!settings.enabled) return;

  const welcomeEmbed = new EmbedBuilder()
    .setColor(settings.color)
    .setTitle(settings.title)
    .setDescription(settings.description.replace('{user}', member.user.username).replace('{server}', member.guild.name))
    .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
    .setFooter({ text: `${member.guild.name} • Member #${member.guild.memberCount}` })
    .setTimestamp();

  if (settings.bannerUrl) {
    welcomeEmbed.setImage(settings.bannerUrl);
  }

  // Create buttons
  const buttonRows = [];
  if (settings.buttons && settings.buttons.length > 0) {
    let currentRow = new ActionRowBuilder();
    let buttonCount = 0;

    for (const btn of settings.buttons) {
      if (buttonCount === 5) {
        buttonRows.push(currentRow);
        currentRow = new ActionRowBuilder();
        buttonCount = 0;
      }

      const button = new ButtonBuilder()
        .setLabel(btn.label)
        .setStyle(ButtonStyle.Link);

      if (btn.emoji) {
        button.setEmoji(btn.emoji);
      }

      if (btn.url) {
        button.setURL(btn.url);
      } else if (btn.channelId) {
        button.setURL(`https://discord.com/channels/${guildId}/${btn.channelId}`);
      }

      currentRow.addComponents(button);
      buttonCount++;
    }

    if (currentRow.components.length > 0) {
      buttonRows.push(currentRow);
    }
  }

  // Find welcome channel
  const welcomeChannel = member.guild.channels.cache.find(
    (ch) => ch.name === 'welcome' && ch.isTextBased()
  );

  if (welcomeChannel) {
    welcomeChannel.send({
      embeds: [welcomeEmbed],
      components: buttonRows,
    });
  } else {
    member.send({
      embeds: [welcomeEmbed],
      components: buttonRows,
    }).catch(() => {
      console.log(`Could not send DM to ${member.user.tag}`);
    });
  }
});

// Function to show welcome modal
function showWelcomeModal(interaction) {
  const modal = new ModalBuilder()
    .setCustomId('welcome_modal')
    .setTitle('Setup Welcome Message');

  const guildId = interaction.guildId;
  const settings = welcomeSettings[guildId] || {};

  const titleInput = new TextInputBuilder()
    .setCustomId('welcome_title')
    .setLabel('Title (e.g. 👋 Welcome!)')
    .setStyle(TextInputStyle.Short)
    .setMaxLength(256)
    .setValue(settings.title || '👋 Welcome!')
    .setRequired(true);

  const descInput = new TextInputBuilder()
    .setCustomId('welcome_desc')
    .setLabel('Description ({user}, {server})')
    .setStyle(TextInputStyle.Paragraph)
    .setMaxLength(4000)
    .setValue(settings.description || 'Welcome {user}!')
    .setRequired(true);

  const colorInput = new TextInputBuilder()
    .setCustomId('welcome_color')
    .setLabel('Color (#0099ff)')
    .setStyle(TextInputStyle.Short)
    .setMaxLength(7)
    .setValue(settings.color || '#0099ff')
    .setRequired(true);

  const bannerInput = new TextInputBuilder()
    .setCustomId('welcome_banner')
    .setLabel('Banner Image URL')
    .setStyle(TextInputStyle.Short)
    .setMaxLength(500)
    .setValue(settings.bannerUrl || '')
    .setRequired(false);

  modal.addComponents(
    new ActionRowBuilder().addComponents(titleInput),
    new ActionRowBuilder().addComponents(descInput),
    new ActionRowBuilder().addComponents(colorInput),
    new ActionRowBuilder().addComponents(bannerInput)
  );

  interaction.showModal(modal);
}

// Message command handler
client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  // Welcome setup command
  if (command === 'welcomeset') {
    if (!message.member.permissions.has('ManageGuild')) {
      return message.reply('❌ You need "Manage Server" permission!');
    }

    const button = new ButtonBuilder()
      .setCustomId('open_welcome_modal')
      .setLabel('Setup Welcome')
      .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder().addComponents(button);

    message.reply({
      content: '🎨 Click the button to customize your welcome message!',
      components: [row],
    });
  }

  // Add button command
  if (command === 'addbtn') {
    if (!message.member.permissions.has('ManageGuild')) {
      return message.reply('❌ You need "Manage Server" permission!');
    }

    const guildId = message.guildId;
    if (!welcomeSettings[guildId]) {
      welcomeSettings[guildId] = {
        enabled: true,
        title: '👋 Welcome!',
        description: 'Welcome to our server!',
        color: '#0099ff',
        bannerUrl: null,
        buttons: [],
      };
    }

    const label = args[0] || 'Button';
    const emoji = args[1] || '';
    const channelId = args[2] || '';

    welcomeSettings[guildId].buttons.push({
      label,
      emoji,
      url: '',
      channelId,
    });

    saveSettings(welcomeSettings);
    message.reply(`✅ Button added! Label: **${label}**, Emoji: **${emoji}**`);
  }

  // Clear buttons command
  if (command === 'clearbtn') {
    if (!message.member.permissions.has('ManageGuild')) {
      return message.reply('❌ You need "Manage Server" permission!');
    }

    const guildId = message.guildId;
    if (welcomeSettings[guildId]) {
      welcomeSettings[guildId].buttons = [];
      saveSettings(welcomeSettings);
      message.reply('✅ All buttons cleared!');
    }
  }

  // Welcome preview
  if (command === 'welcomepreview') {
    const guildId = message.guildId;
    const settings = welcomeSettings[guildId] || {
      title: '👋 Welcome!',
      description: 'Welcome to our server!',
      color: '#0099ff',
      bannerUrl: null,
      buttons: [],
    };

    const previewEmbed = new EmbedBuilder()
      .setColor(settings.color)
      .setTitle(settings.title)
      .setDescription(settings.description.replace('{user}', message.author.username).replace('{server}', message.guild.name))
      .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
      .setFooter({ text: `${message.guild.name} • Member #${message.guild.memberCount}` })
      .setTimestamp();

    if (settings.bannerUrl) {
      previewEmbed.setImage(settings.bannerUrl);
    }

    const buttonRows = [];
    if (settings.buttons && settings.buttons.length > 0) {
      let currentRow = new ActionRowBuilder();
      let buttonCount = 0;

      for (const btn of settings.buttons) {
        if (buttonCount === 5) {
          buttonRows.push(currentRow);
          currentRow = new ActionRowBuilder();
          buttonCount = 0;
        }

        const button = new ButtonBuilder()
          .setLabel(btn.label)
          .setStyle(ButtonStyle.Link);

        if (btn.emoji) {
          button.setEmoji(btn.emoji);
        }

        if (btn.url) {
          button.setURL(btn.url);
        } else if (btn.channelId) {
          button.setURL(`https://discord.com/channels/${guildId}/${btn.channelId}`);
        } else {
          button.setURL('https://discord.com');
        }

        currentRow.addComponents(button);
        buttonCount++;
      }

      if (currentRow.components.length > 0) {
        buttonRows.push(currentRow);
      }
    }

    message.reply({ embeds: [previewEmbed], components: buttonRows });
  }

  // Toggle welcome
  if (command === 'welcometoggle') {
    if (!message.member.permissions.has('ManageGuild')) {
      return message.reply('❌ You need "Manage Server" permission!');
    }

    const guildId = message.guildId;
    if (!welcomeSettings[guildId]) {
      welcomeSettings[guildId] = {
        enabled: true,
        title: '👋 Welcome!',
        description: 'Welcome to our server!',
        color: '#0099ff',
        bannerUrl: null,
        buttons: [],
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
        { name: `${PREFIX}welcomeset`, value: 'Setup welcome message (customize title, desc, color, image)', inline: false },
        { name: `${PREFIX}addbtn <label> <emoji> <channelId>`, value: 'Add a button to welcome message', inline: false },
        { name: `${PREFIX}clearbtn`, value: 'Remove all buttons', inline: false },
        { name: `${PREFIX}welcomepreview`, value: 'Preview welcome message', inline: false },
        { name: `${PREFIX}welcometoggle`, value: 'Enable/disable welcome', inline: false },
      )
      .setDescription('Admin commands - need Manage Server permission')
      .setTimestamp();

    message.reply({ embeds: [helpEmbed] });
  }

  // Ping command
  if (command === 'ping') {
    message.reply(`🏓 Pong! Latency is ${message.client.ws.ping}ms.`);
  }
});

// Handle button interactions
client.on('interactionCreate', async (interaction) => {
  if (interaction.isButton()) {
    if (interaction.customId === 'open_welcome_modal') {
      if (!interaction.member.permissions.has('ManageGuild')) {
        return interaction.reply({
          content: '❌ You need "Manage Server" permission!',
          ephemeral: true,
        });
      }
      showWelcomeModal(interaction);
    }
  }

  // Handle modal submissions
  if (interaction.isModalSubmit()) {
    if (interaction.customId === 'welcome_modal') {
      const title = interaction.fields.getTextInputValue('welcome_title');
      const description = interaction.fields.getTextInputValue('welcome_desc');
      const color = interaction.fields.getTextInputValue('welcome_color');
      const bannerUrl = interaction.fields.getTextInputValue('welcome_banner') || null;

      const guildId = interaction.guildId;

      // Validate hex color
      const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
      if (!hexRegex.test(color)) {
        return interaction.reply({
          content: '❌ Invalid color! Use format like #0099ff',
          ephemeral: true,
        });
      }

      // Validate image URL
      if (bannerUrl && !bannerUrl.match(/^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i)) {
        return interaction.reply({
          content: '❌ Invalid image URL! Must be a direct image link.',
          ephemeral: true,
        });
      }

      welcomeSettings[guildId] = {
        enabled: true,
        title,
        description,
        color,
        bannerUrl,
        buttons: welcomeSettings[guildId]?.buttons || [],
      };

      saveSettings(welcomeSettings);

      interaction.reply({
        content: '✅ Welcome settings saved!',
        ephemeral: true,
      });
    }
  }
});

// Login with token
client.login(process.env.TOKEN);
