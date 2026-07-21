// ============================================================
// LIVE CONTENT FROM GOOGLE SHEETS
// ============================================================
// Notices, Events, and the Academic Calendar are pulled from a Google
// Sheet, so school staff can update the website by editing a spreadsheet
// — no code, no file uploads, no re-deploying the site.
//
// If the sheet below isn't reachable (not set up yet, or the visitor is
// offline), the page quietly keeps showing the plain HTML already on the
// page instead of breaking.
//
// ONE-TIME SETUP (see STAFF_GUIDE.md for full steps):
// 1. Create a Google Sheet with 3 tabs named exactly: Notices, Events, Calendar
// 2. Share it: Share button -> General access -> "Anyone with the link" -> Viewer
// 3. Open each tab, copy its URL from the browser address bar, paste it below.
// ============================================================

const SHEET_URLS = {
  notices: "https://docs.google.com/spreadsheets/d/1F3aoLYcwQK5tZrqB300NuuO2vaCRvR7FQYzG6Xabr7c/edit?gid=0#gid=0",
  events: "https://docs.google.com/spreadsheets/d/1F3aoLYcwQK5tZrqB300NuuO2vaCRvR7FQYzG6Xabr7c/edit?gid=1772877973#gid=1772877973",
  calendar: "https://docs.google.com/spreadsheets/d/1F3aoLYcwQK5tZrqB300NuuO2vaCRvR7FQYzG6Xabr7c/edit?gid=414072694#gid=414072694",
};

(function () {
  function toCsvUrl(sheetUrl) {
    if (!sheetUrl || sheetUrl.indexOf("PASTE_") === 0) return null;
    const idMatch = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
    const gidMatch = sheetUrl.match(/gid=(\d+)/);
    if (!idMatch) return null;
    const id = idMatch[1];
    const gid = gidMatch ? gidMatch[1] : "0";
    return "https://docs.google.com/spreadsheets/d/" + id + "/export?format=csv&gid=" + gid;
  }

  function parseCsv(text) {
    const rows = [];
    let row = [];
    let field = "";
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (inQuotes) {
        if (c === '"') {
          if (text[i + 1] === '"') { field += '"'; i++; }
          else inQuotes = false;
        } else field += c;
      } else if (c === '"') {
        inQuotes = true;
      } else if (c === ",") {
        row.push(field); field = "";
      } else if (c === "\n") {
        row.push(field); rows.push(row); row = []; field = "";
      } else if (c === "\r") {
        // skip
      } else {
        field += c;
      }
    }
    if (field.length || row.length) { row.push(field); rows.push(row); }
    return rows.filter(function (r) { return r.some(function (cell) { return cell.trim() !== ""; }); });
  }

  function rowsToObjects(rows) {
    if (!rows.length) return [];
    const headers = rows[0].map(function (h) { return h.trim().toLowerCase(); });
    return rows.slice(1).map(function (r) {
      const obj = {};
      headers.forEach(function (h, i) { obj[h] = (r[i] || "").trim(); });
      return obj;
    });
  }

  function fetchSheet(key) {
    const csvUrl = toCsvUrl(SHEET_URLS[key]);
    if (!csvUrl) return Promise.resolve(null);
    return fetch(csvUrl)
      .then(function (res) { return res.ok ? res.text() : null; })
      .then(function (text) { return text ? rowsToObjects(parseCsv(text)) : null; })
      .catch(function () { return null; });
  }

  function isValidIsoDate(s) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
    try {
      return !isNaN(new Date(s + "T00:00:00"));
    } catch (e) {
      return false;
    }
  }

  function formatDate(iso) {
    const d = new Date(iso + "T00:00:00");
    if (isNaN(d)) return iso;
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  }

  // Rows with a Date that isn't exactly YYYY-MM-DD are dropped rather than
  // sorted/bucketed incorrectly — a malformed date silently sorting into the
  // wrong place is worse than the row briefly not appearing at all. Logged
  // to the console so a developer can spot a sheet typo if asked to check.
  function withValidDates(rows, sheetName) {
    return rows.filter(function (r) {
      if (isValidIsoDate(r.date)) return true;
      console.warn('[content.js] Skipping ' + sheetName + ' row with invalid Date "' + r.date + '" — expected format YYYY-MM-DD.', r);
      return false;
    });
  }

  function escapeHtml(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function noticeItemHtml(n) {
    return '<li>' +
      '<div>' +
        '<span class="tag">' + escapeHtml(n.tag) + '</span>' +
        '<div><strong>' + escapeHtml(n.title) + '</strong></div>' +
        '<p style="margin:6px 0 0;">' + escapeHtml(n.details) + '</p>' +
      '</div>' +
      '<span class="date-tag">' + formatDate(n.date) + '</span>' +
    '</li>';
  }

  function renderNotices(notices) {
    const sorted = withValidDates(notices, "Notices").sort(function (a, b) { return b.date.localeCompare(a.date); });

    const fullList = document.getElementById("notices-list");
    if (fullList) fullList.innerHTML = sorted.map(noticeItemHtml).join("");

    const homeList = document.getElementById("notices-home-list");
    if (homeList) homeList.innerHTML = sorted.slice(0, 2).map(noticeItemHtml).join("");
  }

  function eventItemHtml(e) {
    return '<div class="timeline-item">' +
      '<span class="date">' + formatDate(e.date) + '</span>' +
      '<h3>' + escapeHtml(e.title) + '</h3>' +
      '<p>' + escapeHtml(e.details) + '</p>' +
    '</div>';
  }

  function renderEvents(events) {
    const validEvents = withValidDates(events, "Events");
    const todayIso = new Date().toISOString().slice(0, 10);
    const upcoming = validEvents.filter(function (e) { return e.date >= todayIso; })
      .sort(function (a, b) { return a.date.localeCompare(b.date); });
    const past = validEvents.filter(function (e) { return e.date < todayIso; })
      .sort(function (a, b) { return b.date.localeCompare(a.date); })
      .slice(0, 6);

    const upcomingEl = document.getElementById("events-upcoming");
    if (upcomingEl) {
      upcomingEl.innerHTML = upcoming.length
        ? upcoming.map(eventItemHtml).join("")
        : "<p>No upcoming events posted right now — check back soon.</p>";
    }

    const pastEl = document.getElementById("events-recent");
    if (pastEl) pastEl.innerHTML = past.map(eventItemHtml).join("");
  }

  function renderCalendar(rows) {
    const body = document.getElementById("calendar-body");
    if (!body) return;
    body.innerHTML = rows.map(function (r) {
      return '<tr><td>' + escapeHtml(r.term) + '</td><td>' + escapeHtml(r.duration) + '</td><td>' + escapeHtml(r.assessment) + '</td></tr>';
    }).join("");
  }

  document.addEventListener("DOMContentLoaded", function () {
    if (document.getElementById("notices-list") || document.getElementById("notices-home-list")) {
      fetchSheet("notices").then(function (rows) { if (rows && rows.length) renderNotices(rows); });
    }
    if (document.getElementById("events-upcoming") || document.getElementById("events-recent")) {
      fetchSheet("events").then(function (rows) { if (rows && rows.length) renderEvents(rows); });
    }
    if (document.getElementById("calendar-body")) {
      fetchSheet("calendar").then(function (rows) { if (rows && rows.length) renderCalendar(rows); });
    }
  });
})();
