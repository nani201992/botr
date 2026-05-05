// ═══════════════════════════════════════════════════════════════
// PM2 Ecosystem config cho Discord Request Bot
// Chạy: pm2 start ecosystem.config.js
// ═══════════════════════════════════════════════════════════════

module.exports = {
  apps: [{
    name: "discord-request-bot",
    script: "index.js",
    
    // ⚠️ THAY ĐỔI CÁC GIÁ TRỊ SAU ĐÂY:
    env: {
      DISCORD_TOKEN: "PASTE_YOUR_REAL_TOKEN_HERE",     // Token từ Developer Portal
      CLIENT_ID: "1496506636712411146",                // Application ID
      LOG_CHANNEL_ID: "1496507451376402532",           // Channel ID nhận yêu cầu
      ALLOWED_USERS: "PASTE_YOUR_USER_ID_HERE"         // User ID được phép trả lời (phân cách bằng dấu phẩy)
    },
    
    // Cấu hình PM2
    instances: 1,                    // Số instance (1 là đủ)
    autorestart: true,               // Tự động restart khi crash
    watch: false,                    // Không cần watch file
    max_memory_restart: "500M",      // Restart nếu dùng quá 500MB RAM
    error_file: "logs/err.log",      // File log lỗi
    out_file: "logs/out.log",        // File log output
    log_date_format: "YYYY-MM-DD HH:mm:ss"
  }]
};
