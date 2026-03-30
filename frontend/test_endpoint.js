const fetch = require('node-fetch');

async function run() {
    try {
        // 1. Get token
        const loginRes = await fetch("http://localhost:8080/api/v1/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: "admin@manris.com", password: "password123" }) // assuming this is a valid user
        });
        const loginData = await loginRes.json();
        const token = loginData.data.token;
        console.log("Token:", token ? "Found" : "Missing");

        // 2. Query endpoint
        const riskId = "932eaac6-6dd0-4063-8d77-3f3360ec3d72";
        const res = await fetch(`http://localhost:8080/api/v1/risks/${riskId}/tasks`, {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });
        
        console.log("Status:", res.status);
        const text = await res.text();
        console.log("Response:", text);
    } catch (e) {
        console.log("Error:", e);
    }
}
run();
