const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, ChannelSelectMenuBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');
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
const imagesDir = path.join(__dirname, 'welcome-images');

// Create images directory if it doesn't exist
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir);
}

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

// Create dashboard embed
function createDashboard(guildId) {
  const settings = welcomeSettings[guildId] || {
    enabled: false,
    title: '👋 Welcome!',
    description: 'Welcome to our server!',
    color: '#0099ff',
    bannerFile: null,
    channels: [],
  };

  const embed = new EmbedBuilder()
    .setColor(settings.color)
    .setTitle('⚙️ WELCOME BOT DASHBOARD')
    .setDescription('Manage your welcome message settings')
    .addFields(
      {
        name: '📋 Current Configuration:',
        value: `
• **Title:** ${settings.title}
• **Description:** ${settings.description.substring(0, 50)}${settings.description.length > 50 ? '...' : ''}
• **Color:** ${settings.color}
• **Banner:** ${settings.bannerFile ? '✅ Uploaded' : '❌ Not set'}
• **Channels:** ${settings.channels.length > 0 ? `✅ ${settings.channels.length} channel(s)` : '❌ No channels'}
• **Status:** ${settings.enabled ? '✅ **ENABLED**' : '❌ **DISABLED**'}
        `.trim(),
        inline: false,
      },
      {
        name: '💡 How to Use:',
        value: `
1️⃣ **Customize** - Set title, description, color
2️⃣ **Upload Banner** - Add image/GIF
3️⃣ **Add Channels** - Paste channel links
4️⃣ **Preview** - See how it looks
5️⃣ **Save & Enable** - Activate welcome message
        `.trim(),
        inline: false,
      }
    )
    .setFooter({ text: 'Click buttons below to manage' })
    .setTimestamp();

  return embed;
}

// Create dashboard buttons
function createDashboardButtons() {
  const row1 = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('customize_welcome')
        .setLabel('Customize')
        .setEmoji('🎨')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('upload_banner')
        .setLabel('Upload Banner')
        .setEmoji('🖼️')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('add_channels')
        .setLabel('Add Channels')
        .setEmoji('🔗')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('preview_welcome')
        .setLabel('Preview')
        .setEmoji('👁️')
        .setStyle(ButtonStyle.Secondary)
    );

  const row2 = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('clear_all')
        .setLabel('Clear All')
        .setEmoji('🧹')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('save_enable')
        .setLabel('Save & Enable')
        .setEmoji('✅')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('disable_welcome')
        .setLabel('Disable')
        .setEmoji('❌')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('help_welcome')
        .setLabel('Help')
        .setEmoji('🆘')
        .setStyle(ButtonStyle.Secondary)
    );

  return [row1, row2];
}

// Bot ready event
client.on('clientReady', () => {
  console.log(`✅ Bot logged in as ${client.user.tag}`);
  client.user.setActivity('members joining', { type: 'WATCHING' });
});

// Welcome message when member joins
client.on('guildMemberAdd', (member) => {
  const guildId = member.guild.id;
  const settings = welcomeSettings[guildId] || {
    enabled: false,
    title: '👋 Welcome!',
    description: 'Welcome to our server!',
    color: '#0099ff',
    bannerFile: null,
    channels: [],
  };

  if (!settings.enabled) return;

  const welcomeEmbed = new EmbedBuilder()
    .setColor(settings.color)
    .setTitle(settings.title)
    .setDescription(settings.description.replace('{user}', member.user.username).replace('{server}', member.guild.name))
    .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
    .setFooter({ text: `${member.guild.name} • Member #${member.guild.memberCount}` })
    .setTimestamp();

  if (settings.bannerFile) {
    welcomeEmbed.setImage(`attachment://${settings.bannerFile}`);
  }

  // Create buttons from channels
  const buttonRows = [];
  if (settings.channels && settings.channels.length > 0) {
    let currentRow = new ActionRowBuilder();
    let buttonCount = 0;

    for (const channelData of settings.channels) {
      if (buttonCount === 5) {
        buttonRows.push(currentRow);
        currentRow = new ActionRowBuilder();
        buttonCount = 0;
      }

      const button = new ButtonBuilder()
        .setLabel(channelData.label)
        .setStyle(ButtonStyle.Link)
        .setEmoji(channelData.emoji)
        .setURL(`https://discord.com/channels/${guildId}/${channelData.channelId}`);

      currentRow.addComponents(button);
      buttonCount++;
    }

    if (currentRow.components.length > 0) {
      buttonRows.push(currentRow);
    }
  }

  const welcomeChannel = member.guild.channels.cache.find(
    (ch) => ch.name === 'welcome' && ch.isTextBased()
  );

  const messageOptions = {
    embeds: [welcomeEmbed],
    components: buttonRows,
  };

  if (settings.bannerFile) {
    const filePath = path.join(imagesDir, settings.bannerFile);
    if (fs.existsSync(filePath)) {
      messageOptions.files = [filePath];
    }
  }

  if (welcomeChannel) {
    welcomeChannel.send(messageOptions);
  } else {
    member.send(messageOptions).catch(() => {
      console.log(`Could not send DM to ${member.user.tag}`);
    });
  }
});

// Message command handler
client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  // Welcome dashboard command
  if (command === 'welcomedashboard' || command === 'dashboard') {
    if (!message.member.permissions.has('ManageGuild')) {
      return message.reply('❌ You need "Manage Server" permission!');
    }

    const guildId = message.guildId;
    const dashboard = createDashboard(guildId);
    const buttons = createDashboardButtons();

    message.reply({
      embeds: [dashboard],
      components: buttons,
    });
  }

  // Help command
  if (command === 'help') {
    const helpEmbed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('📚 Bot Commands')
      .addFields(
        { name: `${PREFIX}welcomedashboard`, value: 'Open welcome setup dashboard', inline: false },
        { name: `${PREFIX}help`, value: 'Show this message', inline: false },
        { name: `${PREFIX}ping`, value: 'Bot latency', inline: false }
      )
      .setDescription('Use the dashboard for all configuration options!')
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
  if (!interaction.isButton()) return;

  const guildId = interaction.guildId;
  if (!welcomeSettings[guildId]) {
    welcomeSettings[guildId] = {
      enabled: false,
      title: '👋 Welcome!',
      description: 'Welcome to our server!',
      color: '#0099ff',
      bannerFile: null,
      channels: [],
    };
  }

  // Customize button
  if (interaction.customId === 'customize_welcome') {
    if (!interaction.member.permissions.has('ManageGuild')) {
      return interaction.reply({ content: '❌ You need "Manage Server" permission!', ephemeral: true });
    }

    const modal = new ModalBuilder()
      .setCustomId('customize_modal')
      .setTitle('Customize Welcome Message');

    const titleInput = new TextInputBuilder()
      .setCustomId('welcome_title')
      .setLabel('Title')
      .setStyle(TextInputStyle.Short)
      .setMaxLength(256)
      .setValue(welcomeSettings[guildId].title)
      .setRequired(true);

    const descInput = new TextInputBuilder()
      .setCustomId('welcome_desc')
      .setLabel('Description ({user}, {server})')
      .setStyle(TextInputStyle.Paragraph)
      .setMaxLength(4000)
      .setValue(welcomeSettings[guildId].description)
      .setRequired(true);

    const colorInput = new TextInputBuilder()
      .setCustomId('welcome_color')
      .setLabel('Color (#0099ff)')
      .setStyle(TextInputStyle.Short)
      .setMaxLength(7)
      .setValue(welcomeSettings[guildId].color)
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(titleInput),
      new ActionRowBuilder().addComponents(descInput),
      new ActionRowBuilder().addComponents(colorInput)
    );

    await interaction.showModal(modal);
  }

  // Upload banner button
  if (interaction.customId === 'upload_banner') {
    if (!interaction.member.permissions.has('ManageGuild')) {
      return interaction.reply({ content: '❌ You need "Manage Server" permission!', ephemeral: true });
    }

    interaction.reply({
      content: '📤 **Reply to this message with your banner image/GIF!**\n\nSupported: PNG, JPG, GIF, WEBP (max 25MB)',
      ephemeral: true,
    });
  }

  // Add channels button
  if (interaction.customId === 'add_channels') {
    if (!interaction.member.permissions.has('ManageGuild')) {
      return interaction.reply({ content: '❌ You need "Manage Server" permission!', ephemeral: true });
    }

    interaction.reply({
      content: '🔗 **Reply to this message with channel links!**\n\nExample:\n```\nhttps://discord.com/channels/123456/789012 (📖 Rules)\nhttps://discord.com/channels/123456/345678 (👤 Intro)\n```\n\nFormat: `[link] ([emoji] Label)`',
      ephemeral: true,
    });
  }

  // Preview button
  if (interaction.customId === 'preview_welcome') {
    const settings = welcomeSettings[guildId];
    const previewEmbed = new EmbedBuilder()
      .setColor(settings.color)
      .setTitle(settings.title)
      .setDescription(settings.description.replace('{user}', interaction.user.username).replace('{server}', interaction.guild.name))
      .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
      .setFooter({ text: `${interaction.guild.name} • Member #${interaction.guild.memberCount}` })
      .setTimestamp();

    if (settings.bannerFile) {
      previewEmbed.setImage(`attachment://${settings.bannerFile}`);
    }

    const buttonRows = [];
    if (settings.channels && settings.channels.length > 0) {
      let currentRow = new ActionRowBuilder();
      let buttonCount = 0;

      for (const channelData of settings.channels) {
        if (buttonCount === 5) {
          buttonRows.push(currentRow);
          currentRow = new ActionRowBuilder();
          buttonCount = 0;
        }

        const button = new ButtonBuilder()
          .setLabel(channelData.label)
          .setStyle(ButtonStyle.Link)
          .setEmoji(channelData.emoji)
          .setURL(`https://discord.com/channels/${guildId}/${channelData.channelId}`);

        currentRow.addComponents(button);
        buttonCount++;
      }

      if (currentRow.components.length > 0) {
        buttonRows.push(currentRow);
      }
    }

    const msgOptions = { embeds: [previewEmbed], components: buttonRows };

    if (settings.bannerFile) {
      const filePath = path.join(imagesDir, settings.bannerFile);
      if (fs.existsSync(filePath)) {
        msgOptions.files = [filePath];
      }
    }

    interaction.reply(msgOptions);
  }

  // Clear all button
  if (interaction.customId === 'clear_all') {
    if (!interaction.member.permissions.has('ManageGuild')) {
      return interaction.reply({ content: '❌ You need "Manage Server" permission!', ephemeral: true });
    }

    if (welcomeSettings[guildId].bannerFile) {
      const filePath = path.join(imagesDir, welcomeSettings[guildId].bannerFile);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    welcomeSettings[guildId] = {
      enabled: false,
      title: '👋 Welcome!',
      description: 'Welcome to our server!',
      color: '#0099ff',
      bannerFile: null,
      channels: [],
    };

    saveSettings(welcomeSettings);

    const dashboard = createDashboard(guildId);
    const buttons = createDashboardButtons();

    interaction.reply({ content: '🧹 All settings cleared!', ephemeral: true });
    interaction.message.edit({ embeds: [dashboard], components: buttons });
  }

  // Save & Enable button
  if (interaction.customId === 'save_enable') {
    if (!interaction.member.permissions.has('ManageGuild')) {
      return interaction.reply({ content: '❌ You need "Manage Server" permission!', ephemeral: true });
    }

    welcomeSettings[guildId].enabled = true;
    saveSettings(welcomeSettings);

    const dashboard = createDashboard(guildId);
    const buttons = createDashboardButtons();

    interaction.reply({ content: '✅ Welcome message **ENABLED**!', ephemeral: true });
    interaction.message.edit({ embeds: [dashboard], components: buttons });
  }

  // Disable button
  if (interaction.customId === 'disable_welcome') {
    if (!interaction.member.permissions.has('ManageGuild')) {
      return interaction.reply({ content: '❌ You need "Manage Server" permission!', ephemeral: true });
    }

    welcomeSettings[guildId].enabled = false;
    saveSettings(welcomeSettings);

    const dashboard = createDashboard(guildId);
    const buttons = createDashboardButtons();

    interaction.reply({ content: '❌ Welcome message **DISABLED**!', ephemeral: true });
    interaction.message.edit({ embeds: [dashboard], components: buttons });
  }

  // Help button
  if (interaction.customId === 'help_welcome') {
    const helpEmbed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('📚 Dashboard Help')
      .addFields(
        { name: '🎨 Customize', value: 'Set title, description, and embed color', inline: true },
        { name: '🖼️ Upload Banner', value: 'Add image/GIF for welcome message', inline: true },
        { name: '🔗 Add Channels', value: 'Add channel links as buttons', inline: true },
        { name: '👁️ Preview', value: 'See how welcome message will look', inline: true },
        { name: '✅ Save & Enable', value: 'Activate welcome for new members', inline: true },
        { name: '❌ Disable', value: 'Turn off welcome messages', inline: true }
      );

    interaction.reply({ embeds: [helpEmbed], ephemeral: true });
  }
});

// Handle modal submissions
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isModalSubmit()) return;

  if (interaction.customId === 'customize_modal') {
    const title = interaction.fields.getTextInputValue('welcome_title');
    const description = interaction.fields.getTextInputValue('welcome_desc');
    const color = interaction.fields.getTextInputValue('welcome_color');

    const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    if (!hexRegex.test(color)) {
      return interaction.reply({ content: '❌ Invalid color! Use format like #0099ff', ephemeral: true });
    }

    const guildId = interaction.guildId;
    welcomeSettings[guildId].title = title;
    welcomeSettings[guildId].description = description;
    welcomeSettings[guildId].color = color;

    saveSettings(welcomeSettings);

    interaction.reply({ content: '✅ Settings saved!', ephemeral: true });
  }
});

// Handle file uploads for banner
client.on('messageCreate', async (message) => {
  if (message.author.bot || message.content.startsWith(PREFIX)) return;
  if (message.attachments.size === 0) return;
  if (!message.member.permissions.has('ManageGuild')) return;
  if (!message.reference) return;

  try {
    const attachment = message.attachments.first();
    const validTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];

    if (!validTypes.includes(attachment.contentType)) {
      return message.reply('❌ Invalid file type! Only PNG, JPG, GIF, WEBP are supported.');
    }

    if (attachment.size > 25 * 1024 * 1024) {
      return message.reply('❌ File too large! Maximum size is 25MB.');
    }

    const guildId = message.guildId;
    const ext = attachment.name.split('.').pop();
    const filename = `${guildId}-${Date.now()}.${ext}`;
    const filepath = path.join(imagesDir, filename);

    const response = await fetch(attachment.url);
    const buffer = await response.buffer();
    fs.writeFileSync(filepath, buffer);

    if (welcomeSettings[guildId]?.bannerFile) {
      const oldPath = path.join(imagesDir, welcomeSettings[guildId].bannerFile);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    if (!welcomeSettings[guildId]) {
      welcomeSettings[guildId] = {
        enabled: false,
        title: '👋 Welcome!',
        description: 'Welcome to our server!',
        color: '#0099ff',
        bannerFile: null,
        channels: [],
      };
    }

    welcomeSettings[guildId].bannerFile = filename;
    saveSettings(welcomeSettings);

    message.reply('✅ Banner uploaded successfully!');
  } catch (error) {
    console.error('Error uploading banner:', error);
    message.reply('❌ Error uploading banner! Try again.');
  }
});

// Handle channel links
client.on('messageCreate', async (message) => {
  if (message.author.bot || message.content.startsWith(PREFIX)) return;
  if (!message.member.permissions.has('ManageGuild')) return;
  if (!message.reference) return;

  const channelRegex = /https:\/\/discord\.com\/channels\/\d+\/(\d+)/g;
  const matches = [...message.content.matchAll(channelRegex)];

  if (matches.length === 0) return;

  try {
    const guildId = message.guildId;

    if (!welcomeSettings[guildId]) {
      welcomeSettings[guildId] = {
        enabled: false,
        title: '👋 Welcome!',
        description: 'Welcome to our server!',
        color: '#0099ff',
        bannerFile: null,
        channels: [],
      };
    }

    welcomeSettings[guildId].channels = [];

    for (const line of message.content.split('\n')) {
      const match = line.match(/https:\/\/discord\.com\/channels\/\d+\/(\d+)\s*\(([^)]+)\)/);
      if (match) {
        const channelId = match[1];
        const labelText = match[2].trim();
        const emojiMatch = labelText.match(/^(\S+)\s+(.+)/);

        if (emojiMatch) {
          const emoji = emojiMatch[1];
          const label = emojiMatch[2];

          welcomeSettings[guildId].channels.push({
            channelId,
            emoji,
            label,
          });
        }
      }
    }

    saveSettings(welcomeSettings);
    message.reply(`✅ Added ${welcomeSettings[guildId].channels.length} channel(s) as buttons!`);
  } catch (error) {
    console.error('Error adding channels:', error);
    message.reply('❌ Error adding channels! Try again.');
  }
});

// Login with token
client.login(process.env.TOKEN);
