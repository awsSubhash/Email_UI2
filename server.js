require("dotenv").config();
const express = require("express");
const nodemailer = require("nodemailer");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");
const session = require("express-session");

const app = express();
const PORT = process.env.PORT || 5000;

// ✅ Authentication Configuration
const VALID_USER = {
    email: "subhash@gmail.com",
    password: "Subhash@123" // Demo only - use hashed passwords in production
};

// ✅ Middleware
app.use(express.json());
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key-123',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: process.env.NODE_ENV === 'production',
        maxAge: 3600000 // 1 hour session
    }
}));

// ✅ Authentication Middleware
const requireAuth = (req, res, next) => {
    if (!req.session.authenticated) {
        return res.redirect('/login.html');
    }
    next();
};

// ✅ Protect main routes before static files
app.get('/', requireAuth);
app.get('/index.html', requireAuth);

// Serve static files after auth check
app.use(express.static(path.join(__dirname, "public")));

// ✅ Login Route
app.post("/login", (req, res) => {
    const { email, password } = req.body;
    
    if (email === VALID_USER.email && password === VALID_USER.password) {
        req.session.authenticated = true;
        return res.json({ 
            success: true,
            redirect: '/' // Explicit redirect path
        });
    }
    res.status(401).json({ 
        success: false, 
        message: "Invalid credentials" 
    });
});

// Logout Route
app.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error('❌ Logout Error:', err);
            return res.status(500).json({ success: false });
        }
        res.clearCookie('connect.sid'); // Clear session cookie
        res.json({ success: true });
    });
});

// ✅ Protect Email Route
app.use("/send-email", requireAuth);

// ✅ Nodemailer Configuration
const transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD
    }
});

// ✅ Email Sending Route
app.post("/send-email", requireAuth, async (req, res) => {
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
        if (!teamsEngaged || (Array.isArray(teamsEngaged) && teamsEngaged.length === 0) ||
    (typeof teamsEngaged === 'string' && teamsEngaged.trim() === "")) {
    missingFields.push("Teams Engaged");
}
        
if (!chainOfEvents || chainOfEvents.trim() === "") missingFields.push("Chain of Events");

        // ✅ Status Validation
        const normalizedStatus = status.trim().toLowerCase();
        if (["green", "amber"].includes(normalizedStatus) && (!outageEnd || outageEnd.trim() === "")) {
            missingFields.push("Outage End (Required for Amber/Green)");
        }

        if (missingFields.length > 0) {
            return res.status(400).json({ 
                success: false, 
                message: `⚠️ Missing Fields: ${missingFields.join(", ")}` 
            });
        }

        // ✅ Status Configuration
        const statusMapping = {
            red: "RED",
            amber: "AMBER",
            green: "GREEN"
        };
        const statusDisplayMap = {
            red: "Investigating",
            amber: "Under Observation",
            green: "Resolved"
        };
        
        const subjectStatus = statusMapping[normalizedStatus] || "UNKNOWN";
        const displayStatus = statusDisplayMap[normalizedStatus] || "Unknown";

        // ✅ Formatting Values
        const formattedOutageEnd = (subjectStatus === "RED" || subjectStatus === "AMBER") ? (outageEnd || "N/A") : outageEnd;
        const formattedTeams = Array.isArray(teamsEngaged) ? teamsEngaged.join(", ") : teamsEngaged || "N/A";
        const formattedChainOfEvents = chainOfEvents ? chainOfEvents.replace(/\n/g, "<br>") : "N/A";

        // ✅ Email Styling
        const bgColor = subjectStatus === "RED" ? "#d32f2f" : subjectStatus === "AMBER" ? "#ff9800" : "#388e3c";

        // ✅ Email Template (Version 1.4 Changes)
        const mailOptions = {
            from: `"Incident Management System" <${process.env.EMAIL_USERNAME}>`,
            to: recipient,
            subject: `${subjectStatus} S1 Outage Communication | ${incidentTitle}`,
            headers: { "X-Incident-Status": subjectStatus },
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f4f4;">
                    <table style="width: 100%; max-width: 600px; margin: auto; background: #fff; border-radius: 8px; box-shadow: 0px 2px 5px #ccc;">
                        <tr>
                            <td style="background: ${bgColor}; color: white; padding: 20px; font-size: 22px; text-align: center; font-weight: bold; border-top-left-radius: 8px; border-top-right-radius: 8px;">
                               Status 🚨 - ${subjectStatus}
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 25px; font-size: 18px; line-height: 1.8; color: #333;">
                                <p><strong>Current Status:</strong> ${displayStatus}</p>
                                <p><strong>Incident Title:</strong> ${incidentTitle}</p>
                                <p><strong>Description:</strong> ${description}</p>
                                <p><strong>Impact:</strong> ${impact}</p>
                                <p><strong>Outage Start:</strong> ${outageStart}</p>
                                ${subjectStatus !== "GREEN" || outageEnd ? `<p><strong>Outage End:</strong> ${formattedOutageEnd}</p>` : ""}
                                <p><strong>Slack Channel:</strong> ${slackChannel}</p>
                                ${subjectStatus === 'GREEN' ? `<p><strong>🆔 Incident ID:</strong> ${incidentId}</p>` : ''}
                                <p><strong>Region:</strong> India</p>
                                <p><strong> Reporter:</strong> OCC Team</p>
                                <p><strong> Zoom Link:</strong> <a href=" https://olacabs.zoom.us/j/7387313438?pwd=a3JEOGZRQnRyV2lQakNnS2JmdUNnQT09" target="_blank" style="color: #007bff;">zoom link</a></p>
                                <p><strong>‍Major Incident Managers:</strong> ${majorIncidentManagers}</p>
                                <p><strong>Teams Engaged:</strong> ${formattedTeams}</p>
                                <p><strong>Chain of Events:</strong> <br>${formattedChainOfEvents}</p>
                                <hr style="border: 0; border-top: 1px solid #ddd;">
                                <p style="color: #999; text-align: center; font-size: 14px;">📧 OLA COMMAND CENTER</p>
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
