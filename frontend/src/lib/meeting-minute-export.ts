import { downloadBlob } from "./risk-export";

type MeetingMinuteExportActionItem = {
  task: string;
  pic?: string;
  ownerUnit?: string;
  deadline?: string;
  priority?: string;
  notes?: string;
};

type MeetingMinuteExportRisk = {
  riskCode?: string;
  riskTitle?: string;
  riskId?: string;
};

export type MeetingMinuteExportData = {
  title: string;
  date: string;
  participants?: string[];
  agenda?: string[];
  summary: string;
  keyPoints?: string[];
  decisions?: string[];
  openIssues?: string[];
  actionItems?: MeetingMinuteExportActionItem[];
  nextCheckIn?: string;
  linkedRisks?: MeetingMinuteExportRisk[];
  createdByName?: string;
  createdAt?: string;
  updatedAt?: string;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatLongDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatDateTime(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function sanitizeFilename(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-+|-+$/g, "") || "briefing-rapat";
}

function buildList(items: string[] = []) {
  if (items.length === 0) {
    return '<p class="empty">-</p>';
  }

  return `
    <ol>
      ${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
    </ol>
  `;
}

function buildParticipants(items: string[] = []) {
  if (items.length === 0) {
    return '<p class="empty">-</p>';
  }

  return `
    <p>${items.map((item) => escapeHtml(item)).join(", ")}</p>
  `;
}

function buildActionItemsTable(items: MeetingMinuteExportActionItem[] = []) {
  if (items.length === 0) {
    return '<p class="empty">-</p>';
  }

  return `
    <table>
      <thead>
        <tr>
          <th style="width: 34%;">Tindak Lanjut</th>
          <th style="width: 18%;">PIC</th>
          <th style="width: 16%;">Deadline</th>
          <th style="width: 12%;">Prioritas</th>
          <th style="width: 20%;">Catatan</th>
        </tr>
      </thead>
      <tbody>
        ${items
          .map(
            (item) => `
              <tr>
                <td>${escapeHtml(item.task || "-")}${item.ownerUnit ? `<div class="muted">${escapeHtml(item.ownerUnit)}</div>` : ""}</td>
                <td>${escapeHtml(item.pic || "-")}</td>
                <td>${escapeHtml(formatLongDate(item.deadline))}</td>
                <td>${escapeHtml(item.priority || "-")}</td>
                <td>${escapeHtml(item.notes || "-")}</td>
              </tr>
            `,
          )
          .join("")}
      </tbody>
    </table>
  `;
}

function buildLinkedRisks(items: MeetingMinuteExportRisk[] = []) {
  if (items.length === 0) {
    return "";
  }

  return `
    <section>
      <h2>Risiko Terkait</h2>
      <ol>
        ${items
          .map((item) => {
            const label = [item.riskCode, item.riskTitle || item.riskId].filter(Boolean).join(" - ");
            return `<li>${escapeHtml(label || "-")}</li>`;
          })
          .join("")}
      </ol>
    </section>
  `;
}

function buildMetadata(data: MeetingMinuteExportData) {
  if (!data.createdByName && !data.createdAt && !data.updatedAt) {
    return "";
  }

  return `
    <section>
      <h2>Metadata</h2>
      <table>
        <tbody>
          <tr>
            <th style="width: 28%;">Dibuat Oleh</th>
            <td>${escapeHtml(data.createdByName || "-")}</td>
          </tr>
          <tr>
            <th>Dibuat Pada</th>
            <td>${escapeHtml(formatDateTime(data.createdAt))}</td>
          </tr>
          <tr>
            <th>Terakhir Diperbarui</th>
            <td>${escapeHtml(formatDateTime(data.updatedAt))}</td>
          </tr>
        </tbody>
      </table>
    </section>
  `;
}

function buildDocumentHtml(data: MeetingMinuteExportData) {
  return `
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(data.title)}</title>
        <style>
          @page {
            size: A4;
            margin: 2.54cm;
          }

          body {
            font-family: Arial, sans-serif;
            font-size: 11pt;
            line-height: 1.15;
            color: #111827;
          }

          h1, h2 {
            text-align: left;
            margin: 0 0 10pt;
          }

          h1 {
            font-size: 14pt;
            font-weight: 700;
            text-align: center;
            margin-bottom: 16pt;
          }

          h2 {
            font-size: 11pt;
            font-weight: 700;
            margin-top: 16pt;
          }

          p, li, td {
            text-align: justify;
          }

          p {
            margin: 0 0 8pt;
          }

          ol, ul {
            margin: 0;
            padding-left: 18pt;
          }

          li {
            margin-bottom: 6pt;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 8pt;
          }

          th, td {
            border: 1px solid #1f2937;
            padding: 6pt;
            vertical-align: top;
            font-size: 11pt;
            font-weight: normal;
          }

          th {
            text-align: left;
            background: #f3f4f6;
          }

          .lead {
            text-align: center;
            margin-bottom: 14pt;
          }

          .empty,
          .muted {
            color: #4b5563;
          }

          .muted {
            margin-top: 4pt;
            font-size: 10pt;
          }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(data.title)}</h1>
        <p class="lead">Tanggal Rapat: ${escapeHtml(formatLongDate(data.date))}</p>

        <section>
          <h2>Peserta</h2>
          ${buildParticipants(data.participants)}
        </section>

        <section>
          <h2>Agenda</h2>
          ${buildList(data.agenda)}
        </section>

        <section>
          <h2>Ringkasan</h2>
          <p>${escapeHtml(data.summary || "-")}</p>
        </section>

        <section>
          <h2>Poin-Poin Kunci</h2>
          ${buildList(data.keyPoints)}
        </section>

        <section>
          <h2>Tindak Lanjut</h2>
          ${buildActionItemsTable(data.actionItems)}
        </section>

        <section>
          <h2>Isu Terbuka</h2>
          ${buildList(data.openIssues)}
        </section>

        <section>
          <h2>Keputusan</h2>
          ${buildList(data.decisions)}
        </section>

        <section>
          <h2>Jadwal Tindak Lanjut Berikutnya</h2>
          <p>${escapeHtml(formatLongDate(data.nextCheckIn))}</p>
        </section>

        ${buildLinkedRisks(data.linkedRisks)}
        ${buildMetadata(data)}
      </body>
    </html>
  `;
}

export function exportMeetingMinuteDocument(data: MeetingMinuteExportData) {
  const html = buildDocumentHtml(data);
  const filename = `${sanitizeFilename(data.title)}.doc`;
  downloadBlob(new Blob(["\ufeff", html], { type: "application/msword" }), filename);
}
