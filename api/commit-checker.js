const express = require("express");
const axios = require("axios");
const dotenv = require("dotenv");
const twilio = require("twilio");

dotenv.config();

// Konfigurasi
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const USERNAME = process.env.GITHUB_USERNAME;
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_WHATSAPP_NUMBER = process.env.TWILIO_WHATSAPP_NUMBER;
const USER_WHATSAPP_NUMBER = process.env.USER_WHATSAPP_NUMBER;

const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

// Fungsi untuk mendapatkan repositori
async function getRecentRepositories() {
  const url = `https://api.github.com/users/${USERNAME}/repos`;

  try {
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
      },
      params: {
        per_page: 100,
      },
    });

    return response.data.map((repo) => repo.name);
  } catch (error) {
    console.error("Error saat mengambil daftar repositori:", error.message);
    return [];
  }
}

// Fungsi untuk mengecek commit hari ini
async function checkCommits(repo) {
  const now = new Date();
  const startOfDay = new Date(now.setUTCHours(0, 0, 0, 0)).toISOString();
  const endOfDay = new Date(now.setUTCHours(23, 59, 59, 999)).toISOString();

  const url = `https://api.github.com/repos/${USERNAME}/${repo}/commits`;

  try {
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
      },
      params: {
        since: startOfDay,
        until: endOfDay,
      },
    });

    return response.data.length > 0;
  } catch (error) {
    console.error(`Error saat memeriksa commit di repo ${repo}:`, error.message);
    return false;
  }
}

// Fungsi untuk mengirim pesan WhatsApp
async function sendWhatsAppMessage(message) {
  try {
    await client.messages.create({
      from: `whatsapp:${TWILIO_WHATSAPP_NUMBER}`,
      to: `whatsapp:${USER_WHATSAPP_NUMBER}`,
      body: message,
    });
    console.log("📩 Pesan WhatsApp berhasil dikirim!");
  } catch (error) {
    console.error("❌ Gagal mengirim pesan WhatsApp:", error.message);
  }
}

// Fungsi utama untuk mengecek commit dan mengirim pesan otomatis setiap detik
const app = express();

// Menggunakan setInterval untuk memeriksa waktu setiap detik
setInterval(async () => {
  const now = new Date();
  const hours = now.getUTCHours();
  const minutes = now.getUTCMinutes();
  console.log({ hours, minutes });

  // Mengecek apakah sekarang adalah jam 12 siang UTC
  if (hours === 3 && minutes === 59) { // 10:38 UTC = 12:00 WIB
    try {
      const repos = await getRecentRepositories();
      let hasCommittedToday = false;

      for (const repo of repos) {
        if (await checkCommits(repo)) {
          hasCommittedToday = true;
          break;
        }
      }

      if (hasCommittedToday) {
        await sendWhatsAppMessage("✅ Anda sudah commit hari ini. Teruskan semangat!");
      } else {
        await sendWhatsAppMessage("❗ Anda belum commit hari ini. Jangan lupa untuk commit!");
      }
    } catch (error) {
      console.error("Error:", error.message);
    }
  }
}, 60000); // Mengecek setiap menit

const port = 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
