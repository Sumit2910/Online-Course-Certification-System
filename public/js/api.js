// Simple API wrapper that always uses API_BASE
const API = {
    async get(path) {
        const res = await fetch(API_BASE + path, {
            method: "GET",
            credentials: "include",
            headers: { "Content-Type": "application/json" }
        });
        return res.json();
    },

    async post(path, body) {
        const res = await fetch(API_BASE + path, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });
        return res.json();
    }
};
