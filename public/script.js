// script.js (Updated Version)
// ✅ Store ticket ID for Green notification
let storedTicketId = null;

// ✅ Function to update current status dynamically
function updateCurrentStatus() {
    const status = document.getElementById("status").value;
    const currentStatus = document.getElementById("current-status");
    const incidentIdGroup = document.getElementById("incident-id-group");
    const outageEndGroup = document.getElementById("outage-end-group");
    const incidentIdInput = document.getElementById("incident-id");

    // Handle unselected state
    if (!status) {
        currentStatus.textContent = "⏳ Status Not Selected";
        currentStatus.style.color = "white";
        currentStatus.style.backgroundColor = "#6c757d"; // Grey color
        incidentIdGroup.style.display = "none";
        outageEndGroup.style.display = "none";
        incidentIdInput.readOnly = false;
        incidentIdInput.value = ""; // Clear Incident ID only on status change to unselected
        return;
    }

    if (status === "RED") {
        currentStatus.textContent = "🚨 Investigating";
        currentStatus.style.color = "white";
        currentStatus.style.backgroundColor = "red";
        incidentIdGroup.style.display = "none";
        outageEndGroup.style.display = "none"; 
        incidentIdInput.readOnly = false;
        incidentIdInput.value = ""; // Clear Incident ID for Red
    } else if (status === "AMBER") {
        currentStatus.textContent = "⚠️ Under Observation";
        currentStatus.style.color = "white";
        currentStatus.style.backgroundColor = "orange";
        incidentIdGroup.style.display = "none"; // Hide for Amber
        outageEndGroup.style.display = "block";
        incidentIdInput.readOnly = true;
        incidentIdInput.value = ""; // Clear Incident ID for Amber
    } else if (status === "GREEN") {
        currentStatus.textContent = "✅ Resolved";
        currentStatus.style.color = "white";
        currentStatus.style.backgroundColor = "green";
        incidentIdGroup.style.display = "block";
        outageEndGroup.style.display = "block";
        incidentIdInput.readOnly = true; // Readonly for Green
        incidentIdInput.value = storedTicketId || ""; // Auto-populate with stored ticket ID
    }
}

// ✅ Initialize status display on page load
document.addEventListener('DOMContentLoaded', () => {
    updateCurrentStatus();
    document.getElementById("status").addEventListener('change', updateCurrentStatus);
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
    if (!majorIncidentManagers) missingFields.push("Major Incident Managers");
    if (!teamsEngaged || teamsEngaged.length === 0) missingFields.push("Teams Engaged");
    if (!chainOfEvents) missingFields.push("Chain of Events");
    
    if (status === "GREEN" || status === "AMBER") {
        if (!outageEnd || outageEnd.trim() === "") {
            missingFields.push("Outage End");
        }
    }

    if (status === "GREEN" && !incidentId) {
        missingFields.push("Incident ID");
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
            // Store ticket ID for Amber notifications
            if (status === "AMBER" && data.incidentId) {
                storedTicketId = data.incidentId;
                console.log('Stored Ticket ID:', storedTicketId); // Debug
            }
            // Reset only the Status field
            document.getElementById("status").value = "";
            // Update UI to reflect reset Status
            updateCurrentStatus();
        } else {
            alert(`❌ Failed to send email: ${data.message || "Check email settings"}`);
        }
    } catch (error) {
        console.error("❌ Error Sending Email:", error);
        alert("⚠️ Network error. Check connection and try again.");
    }
}
