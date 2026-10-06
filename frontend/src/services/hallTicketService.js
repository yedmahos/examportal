import { clearAuth, getAuthToken } from "./api";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "https://examportal-an9p.onrender.com/api";

const filenameFrom = (disposition) => {
  const match = String(disposition || "").match(/filename="([^"]+)"/);
  const filename = match?.[1] || "";
  if (!filename || !filename.toLowerCase().endsWith(".pdf")) {
    return "Hall_Ticket_ExamPortal.pdf";
  }
  return filename;
};

export const hallTicketService = {
  async download(scheduleId) {
    const token = getAuthToken();
    const headers = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetch(`${API_BASE_URL}/hall-tickets/${scheduleId}`, {
      method: "GET",
      headers,
    });

    const type = response.headers.get("Content-Type") || "";
    if (!response.ok || !type.includes("application/pdf")) {
      if (response.status === 401) clearAuth();
      let message = "Hall ticket is unavailable.";
      try {
        const data = await response.json();
        if (data?.message) message = data.message;
      } catch {
        message = `Hall ticket request failed with status ${response.status}`;
      }
      const error = new Error(message);
      error.status = response.status;
      throw error;
    }

    const blob = await response.blob();
    const filename = filenameFrom(response.headers.get("Content-Disposition"));
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1500);
    return filename;
  },
};
