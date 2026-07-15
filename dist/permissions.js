document.addEventListener("DOMContentLoaded", () => {
    const grantBtn = document.getElementById("grant-btn");
    if (grantBtn) {
        grantBtn.onclick = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                stream.getTracks().forEach(t => t.stop());
                window.close();
            } catch (err) {
                alert("Permission error: " + err.message);
            }
        };
    }
});
