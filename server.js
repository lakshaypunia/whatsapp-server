const express = require("express");
const cors = require("cors");
const { create } = require("@open-wa/wa-automate");

let client;

async function startClient() {
      client = await create({
        sessionId: "nextjs-session",
        multiDevice: true,
        qrTimeout: 0,
        authTimeout: 0,
        headless: true,
        dataPath: "/session-data", // This is correct, matches your disk
      
        // --- CHANGED ---
        // REMOVED: useChrome: true
        // REMOVED: executablePath: "/usr/bin/chromium-browser"
      
        // Replaced 'chromiumArgs' with 'puppeteerOptions'
        // and added a few more stable args
        puppeteerOptions: {
         args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-gpu",
          "--single-process", // Helps in low-memory environments
          "--no-zygote"
         ]
        }
        // --- END OF CHANGES ---
       });
    
         console.log("WhatsApp client ready!");
     }
startClient();

const app = express();
app.use(cors());
app.use(express.json());

// API to send message
app.post("/send", async (req, res) => {
  const { number, message } = req.body;

  if (!client) {
    return res.status(503).json({ error: "WhatsApp client not ready yet" });
  }

  try {
    await client.sendText(`${number}@c.us`, message);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(3001, () =>
  console.log("WhatsApp server running on http://localhost:3001")
);
