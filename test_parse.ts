const description = "Kurt ID: tennis-1\nZákazník: Kamil Test\nTelefón: Neznáme\nKanál: Web\nPoznámka: \nVlastník ID: c6b90673-97cf-4ec2-a9df-644596a2a05a";

function parseGCalEvent(description: string) {
    const cleanDesc = description.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "");
    const lines = cleanDesc.split(/\r?\n/);
    
    let userId = "";
    let source = "google-calendar";

    for (const line of lines) {
        const parts = line.split(":");
        if (parts.length >= 2) {
            const key = parts[0].trim().toLowerCase();
            const val = parts.slice(1).join(":").trim();
            
            if (key === "kanál" || key === "kanal" || key === "source") {
                if (val.includes("Web")) source = "web";
                else if (val.includes("Recepcia") || val.includes("admin")) source = "admin";
                else if (val.includes("Hlas") || val.includes("assistant") || val.includes("voice")) source = "voice-assistant";
            } else if (key === "vlastník id" || key === "vlastnik id" || key === "user id" || key === "userid") {
                userId = val;
            }
        }
    }
    return { userId, source };
}

console.log("Test 1 (Plain):", parseGCalEvent(description));

const htmlDesc = "Kurt ID: tennis-1<br>Zákazník: Kamil Test<br>Telefón: Neznáme<br>Kanál: Web<br>Poznámka: <br>Vlastník ID: c6b90673-97cf-4ec2-a9df-644596a2a05a";
console.log("Test 2 (HTML):", parseGCalEvent(htmlDesc));

const weirdHtmlDesc = "<u>Kurt ID: tennis-1</u><br/>Zákazník: Kamil Test<br/>Kanál: Hlas Telio<br/>Vlastník ID: c6b90673-97cf-4ec2-a9df-644596a2a05a";
console.log("Test 3 (Weird HTML):", parseGCalEvent(weirdHtmlDesc));

