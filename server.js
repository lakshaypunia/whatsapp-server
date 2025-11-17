const express = require("express");
const cors = require("cors");
const { create } = require("@open-wa/wa-automate");

let client;

async function startClient() {
    console.log("Starting WhatsApp client..."); // Added log

    client = await create({
        sessionId: "nextjs-session",
        multiDevice: true,
        qrTimeout: 0,
        authTimeout: 0,
        headless: true,

        // --- CRITICAL FIX 1 ---
        // The path MUST be absolute to match your Render Disk's Mount Path.
        dataPath: "/session-data",
        // --- END OF FIX ---

        puppeteerOptions: {
            args: [
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--disable-gpu",
                "--single-process",
                "--no-zygote"
            ]
        }
    });
    
    console.log("WhatsApp client created. Setting up listeners...");

    // --- ADDED LOGGING TO CHECK SESSION ---
    
    // Log when a QR code is generated
    client.onQR((qr) => {
        console.log("QR code generated. Please scan.");
        // You can log the QR code string to your console if you want
        // console.log(qr);
    });

    // Log all state changes (this is what you want to see)
    client.onStateChanged((state) => {
        console.log("Client state changed:", state);
        if (state === "CONFLICT" || state === "UNLAUNCHED") {
            client.forceRefocus();
        }
        if (state === "CONNECTED") {
            console.log("✅ Client is connected! Session should be saved.");
        }
    });
    // --- END OF LOGGING ---

    console.log("WhatsApp client setup complete!");
}

startClient().catch(err => {
    console.error("Error starting client:", err.message);
});

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
        // Ensure number has the @c.us suffix
        const chatId = number.includes('@') ? number : `${number}@c.us`;
        await client.sendText(chatId, message);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- CRITICAL FIX 2 ---
// You MUST use process.env.PORT for Render
const PORT = process.env.PORT || 3001; 
app.listen(PORT, () =>
    console.log(`WhatsApp server running on port ${PORT}`)
);
// --- END OF FIX ---