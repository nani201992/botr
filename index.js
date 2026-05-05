const {
  Client,
  GatewayIntentBits,
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
  Partials,
} = require("discord.js");

// ═══════════════════════════════════════════════════════════════
// ⚙️  CONFIG - Lấy từ environment variables
// ═══════════════════════════════════════════════════════════════
const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID;

// ALLOWED_USERS có thể là 1 ID hoặc nhiều ID phân cách bằng dấu phẩy
// Ví dụ: ALLOWED_USERS="123456789,987654321"
const ALLOWED_REPLIERS = process.env.ALLOWED_USERS 
  ? process.env.ALLOWED_USERS.split(",").map(id => id.trim())
  : [];

// Kiểm tra config bắt buộc
if (!TOKEN) {
  console.error("❌ DISCORD_TOKEN không được cung cấp!");
  console.error("\nCách chạy:");
  console.error("  DISCORD_TOKEN=your_token CLIENT_ID=your_id LOG_CHANNEL_ID=channel_id ALLOWED_USERS=user_id node index.js");
  console.error("\nVí dụ:");
  console.error("  DISCORD_TOKEN=MTk4... CLIENT_ID=1496506636712411146 LOG_CHANNEL_ID=1496507451376402532 ALLOWED_USERS=123456789 node index.js");
  process.exit(1);
}

console.log("╔════════════════════════════════════════════════╗");
console.log("║       🤖 DISCORD REQUEST BOT                  ║");
console.log("╚════════════════════════════════════════════════╝");
console.log("📋 Cấu hình:");
console.log("   • CLIENT_ID:", CLIENT_ID);
console.log("   • LOG_CHANNEL_ID:", LOG_CHANNEL_ID);
console.log("   • ALLOWED_USERS:", ALLOWED_REPLIERS.length > 0 ? ALLOWED_REPLIERS.join(", ") : "⚠️  Chưa cấu hình!");
console.log();

if (ALLOWED_REPLIERS.length === 0) {
  console.warn("⚠️  CẢNH BÁO: ALLOWED_USERS chưa được cấu hình!");
  console.warn("   Không ai có thể nhấn nút Trả lời.");
  console.warn("   Thêm bằng: ALLOWED_USERS=your_user_id node index.js\n");
}

// ═══════════════════════════════════════════════════════════════

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel, Partials.Message],
});

// ── Đăng ký lệnh slash ──────────────────────────────────────────
async function registerCommands() {
  const rest = new REST({ version: "10" }).setToken(TOKEN);
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
  try {
    console.log("⏳ Đang đăng ký lệnh slash...");
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
    console.log("✅ Đã đăng ký lệnh slash thành công.\n");
  } catch (err) {
    console.error("❌ Lỗi khi đăng ký lệnh:", err.message);
    if (err.code === 50001) {
      console.error("   → Bot thiếu quyền. Mời lại bot với đủ permissions.");
    }
  }
}

// ── Helper ───────────────────────────────────────────────────────
function formatTime(date) {
  return `<t:${Math.floor(date.getTime() / 1000)}:F>`;
}

// ── Bot sẵn sàng ─────────────────────────────────────────────────
client.once("ready", async () => {
  console.log(`✅ Bot đã online: ${client.user.tag}`);
  console.log(`   ID: ${client.user.id}\n`);
  await registerCommands();
});

// ── Xử lý interaction ────────────────────────────────────────────
client.on("interactionCreate", async (interaction) => {

  // ══════════════════════════════════════════════════════════════
  // SLASH COMMAND: /request
  // ══════════════════════════════════════════════════════════════
  if (interaction.isChatInputCommand() && interaction.commandName === "request") {
    // Chỉ cho phép dùng trong DM
    if (interaction.channel?.type !== ChannelType.DM) {
      return interaction.reply({
        content: "⚠️ Lệnh này chỉ dùng được trong **tin nhắn riêng** với bot.",
        ephemeral: true,
      });
    }

    const noiDung = interaction.options.getString("noidung");
    const user    = interaction.user;
    const sentAt  = new Date();

    // Embed gửi vào kênh log
    const requestEmbed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle("📩 Yêu Cầu Mới")
      .setThumbnail(user.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: "👤 Người gửi",     value: `${user.tag} (<@${user.id}>)`, inline: false },
        { name: "📝 Nội dung",      value: noiDung,                        inline: false },
        { name: "🕐 Thời gian gửi", value: formatTime(sentAt),             inline: false }
      )
      .setFooter({ text: `User ID: ${user.id}` })
      .setTimestamp(sentAt);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`reply_${user.id}`)
        .setLabel("💬 Trả lời")
        .setStyle(ButtonStyle.Primary)
    );

    try {
      const logChannel = await client.channels.fetch(LOG_CHANNEL_ID);
      await logChannel.send({ embeds: [requestEmbed], components: [row] });

      await interaction.reply({
        content: "✅ **Yêu cầu đã được gửi thành công!**\nChủ bot sẽ phản hồi cho bạn sớm nhất có thể.",
      });
      
      console.log(`📩 Yêu cầu mới từ ${user.tag} (${user.id})`);
    } catch (err) {
      console.error("❌ Lỗi khi gửi yêu cầu:", err);
      await interaction.reply({
        content: "❌ Đã xảy ra lỗi khi gửi yêu cầu. Vui lòng thử lại sau.",
        ephemeral: true,
      });
    }
    return;
  }

  // ══════════════════════════════════════════════════════════════
  // BUTTON: Trả lời
  // ══════════════════════════════════════════════════════════════
  if (interaction.isButton() && interaction.customId.startsWith("reply_")) {
    // Kiểm tra quyền
    if (!ALLOWED_REPLIERS.includes(interaction.user.id)) {
      return interaction.reply({
        content: "🚫 Bạn **không có quyền** trả lời yêu cầu này.",
        ephemeral: true,
      });
    }

    const targetUserId = interaction.customId.replace("reply_", "");

    const modal = new ModalBuilder()
      .setCustomId(`reply_modal_${targetUserId}`)
      .setTitle("💬 Gửi Phản Hồi");

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("reply_text")
          .setLabel("Nội dung trả lời")
          .setPlaceholder("Nhập nội dung phản hồi...")
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
          .setMaxLength(2000)
      )
    );

    await interaction.showModal(modal);
    return;
  }

  // ══════════════════════════════════════════════════════════════
  // MODAL SUBMIT: Gửi phản hồi
  // ══════════════════════════════════════════════════════════════
  if (interaction.isModalSubmit() && interaction.customId.startsWith("reply_modal_")) {
    const targetUserId = interaction.customId.replace("reply_modal_", "");
    const replyText    = interaction.fields.getTextInputValue("reply_text");
    const repliedAt    = new Date();

    try {
      const targetUser = await client.users.fetch(targetUserId);

      const replyEmbed = new EmbedBuilder()
        .setColor(0x57f287)
        .setTitle("📬 Phản Hồi Từ Chủ Bot")
        .setThumbnail(client.user.displayAvatarURL({ dynamic: true }))
        .addFields(
          { name: "💬 Nội dung phản hồi",  value: replyText,            inline: false },
          { name: "🕐 Thời gian phản hồi", value: formatTime(repliedAt), inline: false }
        )
        .setFooter({ text: "Tin nhắn tự động từ hệ thống bot." })
        .setTimestamp(repliedAt);

      await targetUser.send({ embeds: [replyEmbed] });

      // Vô hiệu hóa nút sau khi đã trả lời
      await interaction.update({
        components: [
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(`done_${targetUserId}`)
              .setLabel("✅ Đã trả lời")
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(true)
          ),
        ],
      });

      await interaction.followUp({
        content: `✅ Đã gửi phản hồi đến **${targetUser.tag}** thành công!`,
        ephemeral: true,
      });
      
      console.log(`📬 Đã gửi phản hồi đến ${targetUser.tag} (${targetUserId})`);
    } catch (err) {
      console.error("❌ Lỗi khi gửi phản hồi:", err);
      await interaction.reply({
        content: "❌ Không thể gửi phản hồi. Người dùng có thể đã chặn bot hoặc tắt DM.",
        ephemeral: true,
      });
    }
    return;
  }
});

// ══════════════════════════════════════════════════════════════
// CẢNH BÁO: Tin nhắn thường trong DM
// ══════════════════════════════════════════════════════════════
client.on("messageCreate", async (message) => {
  // Bỏ qua bot
  if (message.author.bot) return;
  
  // Chỉ xử lý DM
  if (message.channel.type !== ChannelType.DM) return;

  console.log(`💬 Tin nhắn thường từ ${message.author.tag} trong DM (sẽ cảnh báo)`);

  try {
    await message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xfee75c)
          .setTitle("⚠️ Thông Báo")
          .setDescription(
            "Chủ bot **không thể xem** tin nhắn thường của bạn.\n\n" +
            "Vui lòng dùng lệnh slash để gửi yêu cầu:\n" +
            "```\n/request noidung: Nội dung của bạn\n```"
          )
          .setFooter({ text: "Tin nhắn thường sẽ không được xem xét." }),
      ],
    });
  } catch (err) {
    console.error("❌ Lỗi khi gửi cảnh báo DM:", err);
  }
});

// ══════════════════════════════════════════════════════════════
// XỬ LÝ LỖI
// ══════════════════════════════════════════════════════════════
client.on("error", (err) => {
  console.error("❌ Discord client error:", err);
});

process.on("unhandledRejection", (err) => {
  console.error("❌ Unhandled promise rejection:", err);
});

// ══════════════════════════════════════════════════════════════
// ĐĂNG NHẬP
// ══════════════════════════════════════════════════════════════
console.log("🔄 Đang kết nối tới Discord...\n");
client.login(TOKEN).catch((err) => {
  console.error("❌ Không thể đăng nhập:", err.message);
  if (err.code === "TokenInvalid") {
    console.error("\n⚠️  Token không hợp lệ!");
    console.error("   Vào Discord Developer Portal → Bot → Reset Token để lấy token mới.");
  }
  process.exit(1);
});
