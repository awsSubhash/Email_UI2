// script.js (Updated Version)
// ✅ Function to update current status dynamically
function updateCurrentStatus() {
    const status = document.getElementById("status").value;
    const currentStatus = document.getElementById("current-status");
    const incidentIdGroup = document.getElementById("incident-id-group");

    // Handle unselected state
    if (!status) {
        currentStatus.textContent = "⏳ Status Not Selected";
        currentStatus.style.color = "white";
        currentStatus.style.backgroundColor = "#6c757d"; // Grey color
        incidentIdGroup.style.display = "none";
        return;
    }

    if (status === "RED") {
        currentStatus.textContent = "🚨 Investigating";
        currentStatus.style.color = "white";
        currentStatus.style.backgroundColor = "red";
        incidentIdGroup.style.display = "none";
    } else if (status === "AMBER") {
        currentStatus.textContent = "⚠️ Under Observation";
        currentStatus.style.color = "white";
        currentStatus.style.backgroundColor = "orange";
        incidentIdGroup.style.display = "none";
    } else if (status === "GREEN") {
        currentStatus.textContent = "✅ Resolved";
        currentStatus.style.color = "white";
        currentStatus.style.backgroundColor = "green";
        incidentIdGroup.style.display = "block";
    }
}

// ✅ Initialize status display on page load
document.addEventListener('DOMContentLoaded', () => {
    updateCurrentStatus();
});

// ✅ Function to send an email
async function sendEmail() {
    // Get all form values
    const recipient = document.getElementById("recipient").value.trim();
    const subject = document.getElementById("subject").value.trim();
    const status = document.getElementById("status").value;
    const incidentTitle = document.getElementById("incident-title").value.trim();
    const description = document.getElementById("description").value.trim();
    const impact = document.getElementById("impact").value.trim();
    const outageStart = document.getElementById("outage-start").value;
    const outageEnd = document.getElementById("outage-end").value;
    const slackChannel = document.getElementById("slack-channel").value.trim();
    const incidentId = document.getElementById("incident-id").value.trim();
    const zoomLink = document.getElementById("zoom-link").value.trim();
    const majorIncidentManagers = document.getElementById("major-incident-managers").value.trim();
    const teamsEngaged = Array.from(document.getElementById("teams-engaged").selectedOptions).map(option => option.value);
    const chainOfEvents = document.getElementById("chain-of-events").value.trim();

    // ✅ Enhanced form validation
    const missingFields = [];
    
    if (!recipient) missingFields.push("Recipient Email");
    if (!subject) missingFields.push("Subject");
    if (!status) missingFields.push("Status");
    if (!incidentTitle) missingFields.push("Incident Title");
    if (!description) missingFields.push("Description");
    if (!impact) missingFields.push("Impact");
    if (!outageStart) missingFields.push("Outage Start");
    if (!outageEnd) missingFields.push("Outage End");
    if (!chainOfEvents) missingFields.push("Chain of Events");
    
    // Status-specific validation
    if (status === "GREEN") {
        if (!incidentId) missingFields.push("Incident ID (Required for Green Status)");
    }

    if (missingFields.length > 0) {
        alert(`⚠️ Missing required fields:\n${missingFields.join("\n")}`);
        return;
    }

    const emailData = {
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
        zoomLink,
        majorIncidentManagers,
        teamsEngaged,
        chainOfEvents
    };

    try {
        const response = await fetch("http://localhost:5000/send-email", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(emailData)
        });

        const data = await response.json();
        if (data.success) {
            alert("✅ Email sent successfully!");
            // Optional: Reset form
            document.getElementById("status").value = "";
            updateCurrentStatus();
        } else {
            alert(`❌ Failed to send email: ${data.message || "Check email settings"}`);
        }
    } catch (error) {
        console.error("❌ Error Sending Email:", error);
        alert("⚠️ Network error. Check connection and try again.");
    }
}
