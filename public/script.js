// ✅ Function to update current status dynamically
function updateCurrentStatus() {
    const status = document.getElementById("status").value;
    const currentStatus = document.getElementById("current-status");
    const incidentIdGroup = document.getElementById("incident-id-group");

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

    // ✅ Simple form validation
    if (!recipient || !subject || !incidentTitle || !description || !impact || !outageStart || !outageEnd || !chainOfEvents) {
        alert("⚠️ Please fill all required fields'.");
        return;
    }
    
    if (status === "GREEN" && !incidentId) {
        alert("⚠️ Incident ID is required when status is Green");
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

    // Rest of the function remains unchanged

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
        } else {
            alert("❌ Failed to send email. Please check your email settings.");
        }
    } catch (error) {
        console.error("❌ Error Sending Email:", error);
        alert("⚠️ An error occurred while sending the email. Check console for details.");
    }
}
