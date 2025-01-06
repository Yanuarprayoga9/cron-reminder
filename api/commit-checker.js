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

    console.log(`Pengecekan commit untuk repo ${repo}:`, response.data.length); // Menambahkan log

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

// Fungsi untuk mendapatkan hari dan tanggal
function getFormattedDate() {
  const now = new Date();
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  return now.toLocaleDateString('id-ID', options);
}

// Fungsi untuk mengatur pengingat commit
async function checkAndRemindCommit() {
  const repos = await getRecentRepositories();
  let hasCommittedToday = false;

  for (const repo of repos) {
    if (await checkCommits(repo)) {
      hasCommittedToday = true;
      break;
    }
  }

  const reminderMessage = `❗ Anda belum commit hari ini (${getFormattedDate()}). Jangan lupa untuk commit!`;

  if (hasCommittedToday) {
    console.log("✅ Commit sudah dilakukan hari ini.");
    await sendWhatsAppMessage(`✅ Anda sudah commit hari ini (${getFormattedDate()}). Teruskan semangat!`);
  } else {
    console.log("❗ Anda belum commit hari ini.");
    await sendWhatsAppMessage(reminderMessage);

    // Menunggu 1 jam untuk mengirim pengingat lagi jika belum commit
    const oneHour = 1 * 60 * 60 * 1000; // 1 jam dalam milidetik
    setInterval(async () => {
      console.log("⏳ Mengirim pesan ulang setelah 1 jam.");
      await sendWhatsAppMessage(reminderMessage);
    }, oneHour); // Mengirim pengingat setiap 1 jam
  }
}

const HalfDay = 12 * 60 * 60 * 1000; // Setengah hari dalam milidetik 
// Menjalankan pengecekan commit setiap hari pada jam tertentu (misalnya jam 9 pagi UTC)
setInterval(() => {
  checkAndRemindCommit();
}, HalfDay); // Mengecek setiap 24 jam

// Kirim pesan pertama kali untuk memberi tahu bahwa checker aktif
sendWhatsAppMessage("🚀 Commit checker telah diaktifkan!");
