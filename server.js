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

// ✅ Nodemailer Configuration
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
            subject,
            status,
            incidentTitle,
            description,
            impact,
            outageStart,
            outageEnd,
            slackChannel,
            incidentId,   
            majorIncidentManagers,
            teamsEngaged,
            chainOfEvents
        } = req.body;

        // ✅ Required Fields Validation
        let missingFields = [];

        if (!recipient) missingFields.push("Recipient Email");
        if (!subject) missingFields.push("Subject");
        if (!status) missingFields.push("Status");
        if (!incidentTitle) missingFields.push("Incident Title");
        if (!description) missingFields.push("Description");
        if (!impact) missingFields.push("Impact");
        if (!outageStart) missingFields.push("Outage Start");
        if (!majorIncidentManagers) missingFields.push("Major Incident Managers");
        if (!chainOfEvents || chainOfEvents.trim() === "") missingFields.push("Chain of Events");

        // ✅ Outage End Validation:
        // - Required when Status is GREEN
        // - Optional when Status is RED or AMBER
        const normalizedStatus = status.trim().toLowerCase();
        if (normalizedStatus === "green" && (!outageEnd || outageEnd.trim() === "")) {
            missingFields.push("Outage End (Required for Green)");
        }

        if (missingFields.length > 0) {
            return res.status(400).json({ 
                success: false, 
                message: `⚠️ Missing Fields: ${missingFields.join(", ")}` 
            });
        }

        // ✅ Normalize Status Input
        const statusMapping = {
            red: "RED",
            amber: "AMBER",
            green: "GREEN"
        };
        const subjectStatus = statusMapping[normalizedStatus] || "UNKNOWN"; 

        // ✅ Set Default Value for Outage End (Only for Red & Amber)
        const formattedOutageEnd = (subjectStatus === "RED" || subjectStatus === "AMBER") ? (outageEnd || "N/A") : outageEnd;

        // ✅ Format Additional Fields
        const formattedTeams = Array.isArray(teamsEngaged) ? teamsEngaged.join(", ") : teamsEngaged || "N/A";
        const formattedChainOfEvents = chainOfEvents ? chainOfEvents.replace(/\n/g, "<br>") : "N/A";

        // ✅ Set Background Color Based on Status
        const bgColor = subjectStatus === "RED" ? "#d32f2f" : subjectStatus === "AMBER" ? "#ff9800" : "#388e3c";

        // ✅ Email Subject (No "Status" in Subject Line)
        const updatedSubject = `${subject}`;

        // ✅ Email Body with Larger Font
        const mailOptions = {
            from: `"Incident Management System" <${process.env.EMAIL_USERNAME}>`,
            to: recipient,
            subject: updatedSubject,
            headers: { "X-Incident-Status": subjectStatus },
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f4f4;">
                    <table style="width: 100%; max-width: 600px; margin: auto; background: #fff; border-radius: 8px; box-shadow: 0px 2px 5px #ccc;">
                        <tr>
                            <td style="background: ${bgColor}; color: white; padding: 20px; font-size: 22px; text-align: center; font-weight: bold; border-top-left-radius: 8px; border-top-right-radius: 8px;">
                                🚨 Current Status - ${subjectStatus}
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 25px; font-size: 18px; line-height: 1.8; color: #333;">
                                <p><strong>🔴 Current Status:</strong> ${subjectStatus}</p>
                                <p><strong>📌 Incident Title:</strong> ${incidentTitle}</p>
                                <p><strong>📖 Description:</strong> ${description}</p>
                                <p><strong>⚡ Impact:</strong> ${impact}</p>
                                <p><strong>⏳ Outage Start:</strong> ${outageStart}</p>
                                ${subjectStatus !== "GREEN" || outageEnd ? `<p><strong>✅ Outage End:</strong> ${formattedOutageEnd}</p>` : ""}
                                <p><strong>📢 Slack Channel:</strong> ${slackChannel}</p>
                                ${subjectStatus === 'GREEN' ? `<p><strong>🆔 Incident ID:</strong> ${incidentId}</p>` : ''}
                                <p><strong>🌍 Region:</strong> India</p>
                                <p><strong>👤 Reporter:</strong> OCC Team</p>
                                <p><strong>🔗 Zoom Link:</strong> <a href="https://meet.google.com/landing?hs=197&authuser=0" target="_blank" style="color: #007bff;">Google Meet</a></p>
                                <p><strong>👨‍💼 Major Incident Managers:</strong> ${majorIncidentManagers}</p>
                                <p><strong>💼 Teams Engaged:</strong> ${formattedTeams}</p>
                                <p><strong>📜 Chain of Events:</strong> <br>${formattedChainOfEvents}</p>
                                <hr style="border: 0; border-top: 1px solid #ddd;">
                                <p style="color: #999; text-align: center; font-size: 14px;">📧 OLA COMMAND CENTER</p>
                            </td>
                        </tr>
                    </table>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        
        // ✅ Success Response
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
