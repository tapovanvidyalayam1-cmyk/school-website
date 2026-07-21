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
// ONE-TIME SETUP (ask the site maintainer for the full staff guide):
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

  // Understands whatever date format staff naturally type — "2026-07-25",
  // "25 Jul 2026", "Jul 25, 2026", or just "Jul 25" with no year at all.
  // Deliberately does NOT use the browser's native string-to-Date parsing
  // (new Date("some string")) — that's implementation-defined and varies
  // subtly across browsers, plus plain numeric dates like "6/5/2026" are
  // genuinely ambiguous (June 5 or May 6?). Instead this only ever builds
  // dates via the numeric Date(year, month, day) constructor, which is
  // spec-guaranteed identical everywhere.
  const MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };

  function pad2(n) {
    n = String(n);
    return n.length < 2 ? "0" + n : n;
  }

  function isoFromParts(year, monthIndex, day) {
    return year + "-" + pad2(monthIndex + 1) + "-" + pad2(day);
  }

  function toIsoDate(raw, now) {
    const s = String(raw || "").trim();
    if (!s) return null;

    const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (iso) {
      const y = +iso[1], mo = +iso[2], da = +iso[3];
      return (mo >= 1 && mo <= 12 && da >= 1 && da <= 31) ? s : null;
    }

    // "25 Jul 2026" / "25th July 2026"
    const m1 = s.match(/^(\d{1,2})(?:st|nd|rd|th)?\s+([a-zA-Z]+)\s+(\d{4})$/i);
    // "Jul 25 2026" / "Jul 25th, 2026" / "July 25 2026"
    const m2 = s.match(/^([a-zA-Z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})$/i);
    // "25th Jul" (no year)
    const m3 = s.match(/^(\d{1,2})(?:st|nd|rd|th)?\s+([a-zA-Z]+)$/i);
    // "Jul 25th" (no year)
    const m4 = s.match(/^([a-zA-Z]+)\s+(\d{1,2})(?:st|nd|rd|th)?$/i);

    let day, monthName, year;
    if (m1) { day = +m1[1]; monthName = m1[2]; year = +m1[3]; }
    else if (m2) { monthName = m2[1]; day = +m2[2]; year = +m2[3]; }
    else if (m3) { day = +m3[1]; monthName = m3[2]; }
    else if (m4) { monthName = m4[1]; day = +m4[2]; }
    else return null;

    const monthIndex = MONTHS[monthName.slice(0, 3).toLowerCase()];
    if (monthIndex === undefined || day < 1 || day > 31) return null;

    if (year === undefined) {
      // No year given: assume this year, unless that date already passed
      // more than a month ago — then it almost certainly means next year.
      year = now.getFullYear();
      const guess = new Date(year, monthIndex, day);
      if ((now - guess) / 86400000 > 31) year += 1;
    }

    // Round-trip through the numeric constructor to reject impossible
    // dates like "30 Feb".
    const d = new Date(year, monthIndex, day);
    if (d.getFullYear() !== year || d.getMonth() !== monthIndex || d.getDate() !== day) return null;

    return isoFromParts(year, monthIndex, day);
  }

  function formatDate(iso) {
    const d = new Date(iso + "T00:00:00");
    if (isNaN(d)) return iso;
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  }

  // Normalizes each row's Date to YYYY-MM-DD so sorting/comparison is
  // always a reliable string comparison. Rows with a date that couldn't be
  // understood at all are dropped (logged to the console) rather than
  // risk sorting into the wrong place.
  function withValidDates(rows, sheetName) {
    const now = new Date();
    const out = [];
    rows.forEach(function (r) {
      const iso = toIsoDate(r.date, now);
      if (iso) {
        const copy = {};
        for (const k in r) copy[k] = r[k];
        copy.date = iso;
        out.push(copy);
      } else {
        console.warn('[content.js] Skipping ' + sheetName + ' row — could not understand date "' + r.date + '".', r);
      }
    });
    return out;
  }

  // These sections start invisible (opacity:0 inline in the HTML) so the
  // visitor never sees the static placeholder content on screen at all —
  // whichever content turns out to be final (live sheet data, or the
  // static fallback if the sheet has nothing yet) is set first, then the
  // section fades in once, already correct. Nothing ever visibly changes
  // in front of the visitor.
  function reveal(el) {
    if (!el) return;
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        el.style.opacity = "1";
      });
    });
  }

  function setHtmlAndReveal(el, html) {
    if (!el) return;
    el.innerHTML = html;
    reveal(el);
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

    setHtmlAndReveal(document.getElementById("notices-list"), sorted.map(noticeItemHtml).join(""));
    setHtmlAndReveal(document.getElementById("notices-home-list"), sorted.slice(0, 2).map(noticeItemHtml).join(""));
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

    setHtmlAndReveal(
      document.getElementById("events-upcoming"),
      upcoming.length ? upcoming.map(eventItemHtml).join("") : "<p>No upcoming events posted right now — check back soon.</p>"
    );
    setHtmlAndReveal(
      document.getElementById("events-recent"),
      past.length ? past.map(eventItemHtml).join("") : "<p>Nothing to look back on just yet.</p>"
    );
  }

  function renderCalendar(rows) {
    const html = rows.map(function (r) {
      return '<tr><td>' + escapeHtml(r.term) + '</td><td>' + escapeHtml(r.duration) + '</td><td>' + escapeHtml(r.assessment) + '</td></tr>';
    }).join("");
    setHtmlAndReveal(document.getElementById("calendar-body"), html);
  }

  document.addEventListener("DOMContentLoaded", function () {
    const noticesListEl = document.getElementById("notices-list");
    const noticesHomeEl = document.getElementById("notices-home-list");
    if (noticesListEl || noticesHomeEl) {
      fetchSheet("notices").then(function (rows) {
        if (rows && rows.length) {
          renderNotices(rows);
        } else {
          // No sheet data (not set up yet, or unreachable) — reveal the
          // static placeholder content that's already sitting in the page.
          reveal(noticesListEl);
          reveal(noticesHomeEl);
        }
      });
    }

    const upcomingEl = document.getElementById("events-upcoming");
    const recentEl = document.getElementById("events-recent");
    if (upcomingEl || recentEl) {
      fetchSheet("events").then(function (rows) {
        if (rows && rows.length) {
          renderEvents(rows);
        } else {
          reveal(upcomingEl);
          reveal(recentEl);
        }
      });
    }

    const calendarEl = document.getElementById("calendar-body");
    if (calendarEl) {
      fetchSheet("calendar").then(function (rows) {
        if (rows && rows.length) {
          renderCalendar(rows);
        } else {
          reveal(calendarEl);
        }
      });
    }
  });
})();
