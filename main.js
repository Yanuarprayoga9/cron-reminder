const axios = require("axios");
const cron = require("node-cron");
const dotenv = require("dotenv");
dotenv.config();
// Konfigurasi
const GITHUB_TOKEN =  process.env.GITHUB_TOKEN;
const USERNAME = process.env.GITHUB_USERNAME;

// Fungsi untuk mendapatkan daftar repositori
async function getRepositories() {
  const url = `https://api.github.com/users/${USERNAME}/repos`;

  try {
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
      },
      params: {
        per_page: 100, // Maksimal repositori per halaman
      },
    });

    return response.data.map((repo) => repo.name);
  } catch (error) {
    console.error("Error saat mengambil daftar repositori:", error.message);
    return [];
  }
}

// Fungsi untuk mengecek commit pada repositori tertentu
async function checkCommits(repo) {
  const now = new Date();
  const startOfDay = new Date(now.setUTCHours(0, 0, 0, 0)).toISOString();
  const noon = new Date(now.setUTCHours(12, 0, 0, 0)).toISOString();

  const url = `https://api.github.com/repos/${USERNAME}/${repo}/commits`;

  try {
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
      },
      params: {
        since: startOfDay,
        until: noon,
      },
    });

    if (response.data.length > 0) {
      console.log(`✅ Anda sudah commit di repo ${repo} sebelum jam 12 siang!`);
    } else {
      console.log(`❗ Belum ada commit di repo ${repo} sebelum jam 12 siang.`);
    }
  } catch (error) {
    console.error(`Error saat memeriksa commit di repo ${repo}:`, error.message);
  }
}

// Fungsi utama untuk mengecek semua repositori
async function checkAllRepositories() {
  const repos = await getRepositories();

  if (repos.length === 0) {
    console.log("❗ Tidak ada repositori ditemukan.");
    return;
  }

  console.log("🔍 Memeriksa semua repositori...");
  for (const repo of repos) {
    await checkCommits(repo);
  }
}

// Jalankan pengecekan segera dan jadwalkan pengecekan setiap hari pukul 11:50
cron.schedule("50 11 * * *", () => {
  console.log("🔍 Menjalankan pengecekan harian...");
  checkAllRepositories();
});

// Jalankan pengecekan segera saat file di-eksekusi
checkAllRepositories();
