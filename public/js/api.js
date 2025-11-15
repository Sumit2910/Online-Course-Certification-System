// /public/js/api.js

function getUserId() {
    return localStorage.getItem("user_id") || "";
}

const API = {
    async get(path) {
        const res = await fetch(API_BASE + path, {
            method: "GET",
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
                "x-user-id": getUserId()
            }
        });
        return res.json();
    },

    async post(path, body) {
        const res = await fetch(API_BASE + path, {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
                "x-user-id": getUserId()
            },
            body: JSON.stringify(body)
        });
        return res.json();
    }
};
