const express = require("express");
const cors = require("cors");
const { create } = require("@open-wa/wa-automate");
const path = require("path");

let client;

async function startClient() {
    console.log("Starting WhatsApp client...");

    // CRITICAL: Use absolute path to persistent disk
    const sessionDataPath = "/session-data";
    
    client = await create({
        sessionId: "nextjs-session",
        multiDevice: true,
        qrTimeout: 0,
        authTimeout: 0,
        headless: true,
        
        // This sets the base directory for wa-automate
        dataPath: sessionDataPath,
        
        puppeteerOptions: {
            // CRITICAL FIX: Explicitly set userDataDir to persistent disk
            // This is where Puppeteer actually stores the browser session
            userDataDir: path.join(sessionDataPath, "nextjs-session"),
            
            args: [
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--disable-gpu",
                "--single-process",
                "--no-zygote",
                // Add user-data-dir as an arg for extra assurance
                `--user-data-dir=${path.join(sessionDataPath, "nextjs-session")}`
            ]
        }
    });
    
    console.log("WhatsApp client created. Setting up listeners...");

    client.onQR((qr) => {
        console.log("QR code generated. Please scan.");
    });

    client.onStateChanged((state) => {
        console.log("Client state changed:", state);
        if (state === "CONFLICT" || state === "UNLAUNCHED") {
            client.forceRefocus();
        }
        if (state === "CONNECTED") {
            console.log("✅ Client is connected! Session should be saved to:", sessionDataPath);
        }
    });

    console.log("WhatsApp client setup complete!");
}

startClient().catch(err => {
    console.error("Error starting client:", err.message);
});

const app = express();
app.use(cors());
app.use(express.json());

app.post("/send", async (req, res) => {
    const { number, message } = req.body;

    if (!client) {
        return res.status(503).json({ error: "WhatsApp client not ready yet" });
    }

    try {
        const chatId = number.includes('@') ? number : `${number}@c.us`;
        await client.sendText(chatId, message);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 3001; 
app.listen(PORT, () =>
    console.log(`WhatsApp server running on port ${PORT}`)
);