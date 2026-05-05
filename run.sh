#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# Run script cho Discord Request Bot
# Chỉnh sửa các giá trị bên dưới rồi chạy: chmod +x run.sh && ./run.sh
# ═══════════════════════════════════════════════════════════════

# ⚠️ THAY ĐỔI CÁC GIÁ TRỊ SAU ĐÂY:
export DISCORD_TOKEN="PASTE_YOUR_REAL_TOKEN_HERE"          # Token từ Developer Portal
export CLIENT_ID="1496506636712411146"                     # Application ID
export LOG_CHANNEL_ID="1496507451376402532"                # Channel ID nhận yêu cầu
export ALLOWED_USERS="PASTE_YOUR_USER_ID_HERE"             # User ID được phép trả lời

# Chạy bot
node index.js
