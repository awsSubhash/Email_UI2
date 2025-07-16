/*
 * .env file format (not included as an artifact due to sensitivity):
 * EMAIL_USERNAME=your-email@gmail.com
 * EMAIL_PASSWORD=your-email-password
 * SESSION_SECRET=your-secret-key-123
 * PORT=5000
 * JIRA_BASE_URL=https://your-domain.atlassian.net
 * JIRA_EMAIL=your-jira-email@example.com
 * JIRA_API_TOKEN=your-jira-api-token
 * JIRA_PROJECT_KEY=SUB
 * CONFLUENCE_SPACE_KEY=~71202039b9f76ffc094cd18f839e47de735749
 * CONFLUENCE_PARENT_PAGE_ID=66079 (optional)
 */
require("dotenv").config();
const express = require("express");
const nodemailer = require("nodemailer");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");
const session = require("express-session");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 5000;

// Debug .env loading
console.log('JIRA_BASE_URL:', process.env.JIRA_BASE_URL);
console.log('JIRA_EMAIL:', process.env.JIRA_EMAIL);
console.log('JIRA_API_TOKEN:', process.env.JIRA_API_TOKEN ? 'Set' : 'Not Set');
console.log('JIRA_PROJECT_KEY:', process.env.JIRA_PROJECT_KEY);
console.log('CONFLUENCE_SPACE_KEY:', process.env.CONFLUENCE_SPACE_KEY);
console.log('CONFLUENCE_PARENT_PAGE_ID:', process.env.CONFLUENCE_PARENT_PAGE_ID || 'Not Set');

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

// ✅ Jira and Confluence API Configuration
const apiConfig = {
    baseURL: process.env.JIRA_BASE_URL,
    headers: {
        'Authorization': `Basic ${Buffer.from(
            `${process.env.JIRA_EMAIL}:${process.env.JIRA_API_TOKEN}`
        ).toString('base64')}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
    }
};

// ✅ Validate Jira and Confluence Configuration
if (!process.env.JIRA_BASE_URL || !process.env.JIRA_EMAIL || !process.env.JIRA_API_TOKEN || !process.env.JIRA_PROJECT_KEY) {
    console.error('❌ Missing Jira configuration in .env file. Required: JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN, JIRA_PROJECT_KEY');
}
if (!process.env.CONFLUENCE_SPACE_KEY) {
    console.error('❌ Missing Confluence configuration in .env file. Required: CONFLUENCE_SPACE_KEY');
}

// ✅ Function to Create Jira Ticket
async function createJiraTicket(subject, description) {
    if (!process.env.JIRA_BASE_URL) {
        throw new Error('JIRA_BASE_URL is not defined in .env file');
    }
    const baseUrl = process.env.JIRA_BASE_URL.replace(/\/$/, ''); // Remove trailing slash
    if (!baseUrl.startsWith('http')) {
        throw new Error(`Invalid JIRA_BASE_URL: ${baseUrl}. Must start with http:// or https://`);
    }

    try {
        const response = await axios.post(
            `${baseUrl}/rest/api/3/issue`,
            {
                fields: {
                    project: { key: process.env.JIRA_PROJECT_KEY },
                    summary: subject,
                    description: {
                        type: "doc",
                        version: 1,
                        content: [
                            {
                                type: "paragraph",
                                content: [
                                    { type: "text", text: description }
                                ]
                            }
                        ]
                    },
                    issuetype: { name: "Task" }
                }
            },
            { headers: apiConfig.headers }
        );
        console.log(`✅ Jira Ticket Created: ${response.data.key}`, response.data);
        return response.data.key; // Returns ticket ID (e.g., SUB-123)
    } catch (error) {
        console.error('❌ Jira Ticket Creation Error:', error.response?.data || error.message);
        throw new Error(`Failed to create Jira ticket: ${error.response?.statusText || error.message}`);
    }
}

// ✅ Function to Create Confluence Page
async function createConfluencePage(title, description, chainOfEvents) {
    if (!process.env.JIRA_BASE_URL || !process.env.CONFLUENCE_SPACE_KEY) {
        throw new Error('JIRA_BASE_URL or CONFLUENCE_SPACE_KEY is not defined in .env file');
    }
    const baseUrl = process.env.JIRA_BASE_URL.replace(/\/$/, ''); // Remove trailing slash
    if (!baseUrl.startsWith('http')) {
        throw new Error(`Invalid JIRA_BASE_URL: ${baseUrl}. Must start with http:// or https://`);
    }
    const formattedChainOfEvents = chainOfEvents ? chainOfEvents.replace(/\n/g, '<br>') : 'N/A';

    try {
        const requestBody = {
            type: 'page',
            title: title,
            space: { key: process.env.CONFLUENCE_SPACE_KEY },
            ...(process.env.CONFLUENCE_PARENT_PAGE_ID && {
                ancestors: [{ id: process.env.CONFLUENCE_PARENT_PAGE_ID }]
            }),
            body: {
                storage: {
                    value: `
                        <h2>Description</h2>
                        <p>${description || 'N/A'}</p>
                        <h2>Chain of Events</h2>
                        <p>${formattedChainOfEvents}</p>
                    `,
                    representation: 'storage'
                }
            }
        };
        console.log('Confluence Request Payload:', JSON.stringify(requestBody, null, 2));

        const response = await axios.post(
            `${baseUrl}/wiki/rest/api/content`,
            requestBody,
            { headers: apiConfig.headers }
        );
        console.log(`✅ Confluence Page Created: ${response.data.title}`, response.data);
        return response.data.id; // Returns page ID
    } catch (error) {
        console.error('❌ Confluence Page Creation Error:', {
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data,
            message: error.message
        });
        throw new Error(`Failed to create Confluence page: ${error.response?.statusText || error.message}`);
    }
}

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
            chainOfEvents,
            zoomLink
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

        // ✅ Handle Jira Ticket for Amber Status
        let generatedIncidentId = incidentId;
        if (normalizedStatus === "amber") {
            generatedIncidentId = await createJiraTicket(subject, chainOfEvents);
            req.session.ticketId = generatedIncidentId; // Store ticket ID in session
        } else if (normalizedStatus === "green") {
            // Use stored ticket ID or provided incidentId
            generatedIncidentId = req.session.ticketId || incidentId;
            if (!generatedIncidentId) {
                return res.status(400).json({ 
                    success: false, 
                    message: "⚠️ No Jira ticket ID available. Send an Amber notification first."
                });
            }
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
        const formattedZoomLink = zoomLink && zoomLink.trim() !== "" ? zoomLink : "https://zoom.us/j/123456789";

        // ✅ Email Styling
        const bgColor = subjectStatus === "RED" ? "#d32f2f" : subjectStatus === "AMBER" ? "#ff9800" : "#388e3c";

        // ✅ Email Template
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
                                ${subjectStatus === "GREEN" && generatedIncidentId ? `<p><strong>🆔 Incident ID:</strong> ${generatedIncidentId}</p>` : ""}
                                <p><strong>Region:</strong> India</p>
<<<<<<< HEAD
                                <p><strong>Reporter:</strong> OCC Team</p>
                                <p><strong>Zoom Link:</strong> <a href="${formattedZoomLink}" target="_blank" style="color: #007bff;">Zoom Link</a></p>
                                <p><strong>Major Incident Managers:</strong> ${majorIncidentManagers}</p>
=======
                                <p><strong> Reporter:</strong> OCC Team</p>
                                <p><strong> Zoom Link:</strong> <a href=" " target="_blank" style="color: #007bff;">zoom link</a></p>
                                <p><strong>‍Major Incident Managers:</strong> ${majorIncidentManagers}</p>
>>>>>>> b7fe019655a4557451c2737cd1a0789bb2dcb7ef
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

        // ✅ Send Email
        await transporter.sendMail(mailOptions);
        console.log('✅ Email Sent Successfully');

        // ✅ Create Confluence Page for Green Status
        let confluencePageId = null;
        if (normalizedStatus === "green") {
            try {
                const currentDate = new Date().toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric'
                }); // e.g., "23 June 2025"
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-'); // e.g., 2025-06-23T12-34-56-Z
                const pageTitle = `${currentDate} - ${subject} (${timestamp})`; // Avoid duplicate titles
                confluencePageId = await createConfluencePage(pageTitle, description, chainOfEvents);
            } catch (confluenceError) {
                console.error('⚠️ Confluence Page Creation Failed, but email was sent:', confluenceError);
                // Continue with success response
            }
        }

        res.json({ 
            success: true, 
            message: `✅ Email sent successfully!${confluencePageId ? " Confluence page created!" : " Warning: Confluence page creation failed, but email sent."}`,
            incidentId: generatedIncidentId,
            confluencePageId // Return page ID for potential client-side use
        });

    } catch (error) {
        console.error('❌ Error Sending Email:', error);
        res.status(500).json({ 
            success: false, 
            message: `⚠️ Email sending failed: ${error.message}` 
        });
    }
});

// ✅ Start Server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
