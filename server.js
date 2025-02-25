require("dotenv").config();
const express = require("express");
const nodemailer = require("nodemailer");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 5000;

// ✅ Middleware
app.use(express.json());
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

const transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD
    }
});

// ✅ Email Sending Route
app.post("/send-email", async (req, res) => {
    try {
        const {
            recipient,
            subject,  // ✅ Email subject from user input
            status,
            incidentTitle,
            description,
            impact,
            outageStart,
            outageEnd, // ✅ Now optional
            majorIncidentManagers,
            teamsEngaged,
            chainOfEvents
        } = req.body;

        // ✅ Default Fields
        const region = "India";
        const reporter = "OCC Team";
        const zoomLink = "https://meet.google.com/landing?hs=197&authuser=0";

        // ✅ Validate Required Fields (Removed `outageEnd`)
        if (!recipient || !subject || !incidentTitle || !description || !impact || !outageStart) {
            return res.status(400).json({ success: false, message: "⚠️ Please fill all required fields." });
        }

        // ✅ Ensure `teamsEngaged` is an array
        const formattedTeams = Array.isArray(teamsEngaged) ? teamsEngaged.join(", ") : "N/A";

        // ✅ Fix Line Break Issue in "Chain of Events"
        const formattedChainOfEvents = chainOfEvents ? chainOfEvents.replace(/\n/g, "<br>") : "N/A";

        // ✅ Handle Optional `outageEnd`
        const outageEndText = outageEnd && outageEnd.trim() !== "" ? outageEnd : "N/A";

        // ✅ Email Template
        const mailOptions = {
            from: `"Incident Management System" <${process.env.EMAIL_USERNAME}>`,
            to: recipient,
            subject: subject, // ✅ Email subject is set properly
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f4f4;">
                    <table style="width: 100%; max-width: 600px; margin: auto; background: #fff; border-radius: 8px; box-shadow: 0px 2px 5px #ccc;">
                        <tr>
                            <td style="background: ${status === 'RED' ? '#d32f2f' : status === 'AMBER' ? '#ff9800' : '#388e3c'}; 
                                color: white; padding: 15px; font-size: 20px; text-align: center; font-weight: bold; 
                                border-top-left-radius: 8px; border-top-right-radius: 8px;">
                                🚨 Incident Notification - ${status}
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 20px; font-size: 14px; line-height: 1.6;">
                                <p><strong>🔴 Status:</strong> ${status}</p>
                                <p><strong>📌 Incident Title:</strong> ${incidentTitle}</p>
                                <p><strong>📖 Description:</strong> ${description}</p>
                                <p><strong>⚡ Impact:</strong> ${impact}</p>
                                <p><strong>⏳ Outage Start:</strong> ${outageStart}</p>
                                <p><strong>✅ Outage End:</strong> ${outageEndText}</p> <!-- ✅ Shows 'N/A' if empty -->
                                <p><strong>🌍 Region:</strong> ${region}</p>
                                <p><strong>👤 Reporter:</strong> ${reporter}</p>
                                <p><strong>🔗 Zoom Link:</strong> <a href="${zoomLink}" target="_blank">${zoomLink}</a></p>
                                <p><strong>👨‍💼 Major Incident Managers:</strong> ${majorIncidentManagers}</p>
                                <p><strong>💼 Teams Engaged:</strong> ${formattedTeams}</p>
                                <p><strong>📜 Chain of Events:</strong> <br>${formattedChainOfEvents}</p>
                                <hr style="border: 0; border-top: 1px solid #ddd;">
                                <p style="color: #999; text-align: center;">📧 Sent via Automated Incident Notification System</p>
                            </td>
                        </tr>
                    </table>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        res.json({ success: true, message: "✅ Email sent successfully!" });

    } catch (error) {
        console.error("❌ Error Sending Email:", error);
        res.status(500).json({ success: false, message: "⚠️ Email sending failed!" });
    }
});

// ✅ Start Server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
