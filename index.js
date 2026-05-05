const {
  Client,
  GatewayIntentBits,
  Partials,
  REST,
  Routes,
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ChannelType,
} = require("discord.js");

require("dotenv").config();

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const TOKEN = "MTQ5NjUwNjYzNjcxMjQxMTE0Ng.G3kYch.BbwXuDS9ig-6ah5ct_WCZG2WiY3k7_bNZa8jdo";
const CLIENT_ID = process.env.CLIENT_ID;
const LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID; // channel where requests appear

if (!TOKEN) throw new Error("Missing TOKEN in .env");
if (!CLIENT_ID) throw new Error("Missing CLIENT_ID in .env");
if (!LOG_CHANNEL_ID) throw new Error("Missing LOG_CHANNEL_ID in .env");

// ─── CLIENT ───────────────────────────────────────────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel, Partials.Message],
});

// ─── REGISTER SLASH COMMANDS ──────────────────────────────────────────────────
const commands = [
  new SlashCommandBuilder()
    .setName("request")
    .setDescription("Gửi yêu cầu đến chủ bot")
    .addStringOption((opt) =>
      opt
        .setName("noidung")
        .setDescription("Nội dung bạn muốn gửi")
        .setRequired(true)
    )
    .toJSON(),
];

async function registerCommands() {
  const rest = new REST({ version: "10" }).setToken(TOKEN);
  try {
    console.log("⏳ Đang đăng ký lệnh slash...");
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
    console.log("✅ Đã đăng ký lệnh slash thành công.");
  } catch (err) {
    console.error("❌ Lỗi khi đăng ký lệnh:", err);
  }
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function formatTime(date) {
  return `<t:${Math.floor(date.getTime() / 1000)}:F>`;
}

// ─── READY ────────────────────────────────────────────────────────────────────
client.once("ready", async () => {
  console.log(`🤖 Bot đã sẵn sàng: ${client.user.tag}`);
  await registerCommands();
});

// ─── INTERACTIONS ─────────────────────────────────────────────────────────────
client.on("interactionCreate", async (interaction) => {
  // /request command
  if (interaction.isChatInputCommand() && interaction.commandName === "request") {
    // Only allow in DMs
    if (interaction.channel?.type !== ChannelType.DM) {
      return interaction.reply({
        content: "⚠️ Lệnh này chỉ dùng được trong tin nhắn riêng với bot.",
        ephemeral: true,
      });
    }

    const noiDung = interaction.options.getString("noidung");
    const user = interaction.user;
    const sentAt = new Date();

    const requestEmbed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle("📩 Yêu Cầu Mới")
      .setThumbnail(user.displayAvatarURL())
      .addFields(
        { name: "👤 Người gửi", value: `${user.tag} (<@${user.id}>)`, inline: false },
        { name: "📝 Nội dung", value: noiDung, inline: false },
        { name: "🕐 Thời gian gửi", value: formatTime(sentAt), inline: false }
      )
      .setFooter({ text: `ID người dùng: ${user.id}` })
      .setTimestamp(sentAt);

    try {
      const logChannel = await client.channels.fetch(LOG_CHANNEL_ID);
      if (!logChannel) throw new Error("Không tìm thấy kênh log.");

      const replyButton = new ButtonBuilder()
        .setCustomId(`reply_${user.id}`)
        .setLabel("💬 Trả lời")
        .setStyle(ButtonStyle.Primary);

      const row = new ActionRowBuilder().addComponents(replyButton);

      const sentMessage = await logChannel.send({
        embeds: [requestEmbed],
        components: [row],
      });

      // Update button to include the message id so we can disable it later
      const updatedButton = new ButtonBuilder()
        .setCustomId(`reply_${user.id}_${sentMessage.id}`)
        .setLabel("💬 Trả lời")
        .setStyle(ButtonStyle.Primary);

      const updatedRow = new ActionRowBuilder().addComponents(updatedButton);
      await sentMessage.edit({ components: [updatedRow] });

      await interaction.reply({
        content:
          "✅ **Yêu cầu của bạn đã được gửi thành công!**\nChủ bot sẽ xem và phản hồi cho bạn sớm nhất có thể.",
        ephemeral: false,
      });
    } catch (err) {
      console.error("❌ Lỗi khi gửi yêu cầu:", err);
      await interaction.reply({
        content: "❌ Đã xảy ra lỗi khi gửi yêu cầu. Vui lòng thử lại sau.",
        ephemeral: true,
      });
    }
  }

  // Button: Reply
  if (interaction.isButton() && interaction.customId.startsWith("reply_")) {
    const parts = interaction.customId.split("_");
    const targetUserId = parts[1];
    const sourceMessageId = parts[2] || null;

    const modal = new ModalBuilder()
      .setCustomId(`reply_modal_${targetUserId}_${sourceMessageId || "none"}`)
      .setTitle("💬 Gửi Phản Hồi");

    const replyInput = new TextInputBuilder()
      .setCustomId("reply_text")
      .setLabel("Nội dung trả lời")
      .setPlaceholder("Nhập nội dung bạn muốn gửi cho người dùng...")
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true)
      .setMaxLength(2000);

    modal.addComponents(new ActionRowBuilder().addComponents(replyInput));

    await interaction.showModal(modal);
  }

  // Modal submit: send reply DM
  if (interaction.isModalSubmit() && interaction.customId.startsWith("reply_modal_")) {
    const parts = interaction.customId.split("_");
    const targetUserId = parts[2];
    const sourceMessageId = parts[3] && parts[3] !== "none" ? parts[3] : null;

    const replyText = interaction.fields.getTextInputValue("reply_text");
    const repliedAt = new Date();

    try {
      const targetUser = await client.users.fetch(targetUserId);

      const replyEmbed = new EmbedBuilder()
        .setColor(0x57f287)
        .setTitle("📬 Phản Hồi Từ Chủ Bot")
        .setThumbnail(client.user.displayAvatarURL())
        .addFields(
          { name: "💬 Nội dung trả lời", value: replyText, inline: false },
          { name: "🕐 Thời gian phản hồi", value: formatTime(repliedAt), inline: false }
        )
        .setFooter({ text: "Đây là tin nhắn tự động từ hệ thống bot." })
        .setTimestamp(repliedAt);

      await targetUser.send({ embeds: [replyEmbed] });

      // Disable original button if we know which message it was
      if (sourceMessageId) {
        try {
          const logChannel = await client.channels.fetch(LOG_CHANNEL_ID);
          if (logChannel && logChannel.isTextBased()) {
            const originalMessage = await logChannel.messages.fetch(sourceMessageId);
            const disabledButton = new ButtonBuilder()
              .setCustomId(`reply_${targetUserId}_${sourceMessageId}`)
              .setLabel("✅ Đã trả lời")
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(true);

            const disabledRow = new ActionRowBuilder().addComponents(disabledButton);
            await originalMessage.edit({ components: [disabledRow] });
          }
        } catch (editErr) {
          console.warn("⚠️ Không thể cập nhật nút đã trả lời:", editErr.message);
        }
      }

      await interaction.reply({
        content: `✅ Đã gửi phản hồi đến **${targetUser.tag}** thành công!`,
        ephemeral: true,
      });
    } catch (err) {
      console.error("❌ Lỗi khi gửi phản hồi:", err);
      await interaction.reply({
        content: "❌ Không thể gửi phản hồi. Người dùng có thể đã chặn bot hoặc không cho phép DM.",
        ephemeral: true,
      });
    }
  }
});

// ─── DM PLAIN TEXT WARNING ────────────────────────────────────────────────────
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (message.channel.type !== ChannelType.DM) return;

  const warningEmbed = new EmbedBuilder()
    .setColor(0xfee75c)
    .setTitle("⚠️ Thông Báo")
    .setDescription(
      "Chủ bot **không thể xem** tin nhắn thường của bạn.\n\n" +
      "Vui lòng sử dụng lệnh `/request` để gửi nội dung đến chủ bot:\n" +
      "```\n/request noidung: <nội dung của bạn>\n```"
    )
    .setFooter({ text: "Tin nhắn thường sẽ không được xem xét." });

  await message.reply({ embeds: [warningEmbed] });
});

// ─── LOGIN ────────────────────────────────────────────────────────────────────
client.login(TOKEN);