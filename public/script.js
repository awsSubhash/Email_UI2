// ✅ Function to update current status dynamically
function updateCurrentStatus() {
    const status = document.getElementById("status").value;
    const currentStatus = document.getElementById("current-status");

    if (status === "RED") {
        currentStatus.textContent = "🚨 Investigating";
        currentStatus.style.color = "white";
        currentStatus.style.backgroundColor = "red";
    } else if (status === "AMBER") {
        currentStatus.textContent = "⚠️ Under Observation";
        currentStatus.style.color = "white";
        currentStatus.style.backgroundColor = "orange";
    } else if (status === "GREEN") {
        currentStatus.textContent = "✅ Resolved";
        currentStatus.style.color = "white";
        currentStatus.style.backgroundColor = "green";
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
    const zoomLink = document.getElementById("zoom-link").value.trim();
    const majorIncidentManagers = document.getElementById("major-incident-managers").value.trim();
    const teamsEngaged = Array.from(document.getElementById("teams-engaged").selectedOptions).map(option => option.value);
    const chainOfEvents = document.getElementById("chain-of-events").value.trim();

    // ✅ Simple form validation
    if (!recipient || !subject || !incidentTitle || !description || !impact || !outageStart || !outageEnd) {
        alert("⚠️ Please fill all required fields.");
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
        } else {
            alert("❌ Failed to send email. Please check your email settings.");
        }
    } catch (error) {
        console.error("❌ Error Sending Email:", error);
        alert("⚠️ An error occurred while sending the email. Check console for details.");
    }
}