// Generate a genuinely valid /public/demo-results.xlsx for the lecturer upload
// (spec Section 10). Minimal OOXML SpreadsheetML written into a STORED (no
// compression) zip with real CRC32s, using only Node built-ins (zlib.crc32,
// available on Node 22.2+). The demo files this via the Intake fixture and never
// parses the binary, but shipping a real, openable Excel file keeps it honest.
//
// Run with:  node scripts/gen-xlsx.mjs

import { writeFileSync, mkdirSync } from "node:fs";
import { crc32 } from "node:zlib";

// The sheet content: CS220 results this term, one row per student on CLO4.
const header = ["Student", "CLO4 score"];
const rows = [
  ["S-0001", 0.55], ["S-0002", 0.62], ["S-0003", 0.48], ["S-0004", 0.71],
  ["S-0005", 0.59], ["S-0006", 0.5], ["S-0007", 0.66], ["S-0008", 0.44],
  ["S-0009", 0.6], ["S-0010", 0.57],
];

function colRef(c) {
  let s = "";
  c += 1;
  while (c > 0) {
    const m = (c - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    c = Math.floor((c - 1) / 26);
  }
  return s;
}

function cellXml(c, r, value) {
  const ref = `${colRef(c)}${r}`;
  if (typeof value === "number") return `<c r="${ref}"><v>${value}</v></c>`;
  return `<c r="${ref}" t="inlineStr"><is><t>${String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;")}</t></is></c>`;
}

function rowXml(cells, r) {
  return `<row r="${r}">${cells.map((v, i) => cellXml(i, r, v)).join("")}</row>`;
}

const sheetRows = [rowXml(header, 1), ...rows.map((row, i) => rowXml(row, i + 2))].join("");
const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${sheetRows}</sheetData></worksheet>`;

const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`;

const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;

const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="CS220 2025-S1" sheetId="1" r:id="rId1"/></sheets></workbook>`;

const wbRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`;

const files = [
  { name: "[Content_Types].xml", data: contentTypes },
  { name: "_rels/.rels", data: rels },
  { name: "xl/workbook.xml", data: workbook },
  { name: "xl/_rels/workbook.xml.rels", data: wbRels },
  { name: "xl/worksheets/sheet1.xml", data: sheetXml },
];

// Build a STORED zip (method 0) with real CRC32s. Fixed DOS date/time (1980-01-01).
const DOS_TIME = 0;
const DOS_DATE = 0x21;
const enc = (s) => Buffer.from(s, "utf8");

const locals = [];
const central = [];
let offset = 0;

for (const f of files) {
  const nameBuf = enc(f.name);
  const dataBuf = enc(f.data);
  const crc = crc32(dataBuf) >>> 0;
  const size = dataBuf.length;

  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(20, 4); // version needed
  local.writeUInt16LE(0, 6); // flags
  local.writeUInt16LE(0, 8); // method 0 (stored)
  local.writeUInt16LE(DOS_TIME, 10);
  local.writeUInt16LE(DOS_DATE, 12);
  local.writeUInt32LE(crc, 14);
  local.writeUInt32LE(size, 18); // comp size
  local.writeUInt32LE(size, 22); // uncomp size
  local.writeUInt16LE(nameBuf.length, 26);
  local.writeUInt16LE(0, 28); // extra len
  locals.push(local, nameBuf, dataBuf);

  const cd = Buffer.alloc(46);
  cd.writeUInt32LE(0x02014b50, 0);
  cd.writeUInt16LE(20, 4); // version made by
  cd.writeUInt16LE(20, 6); // version needed
  cd.writeUInt16LE(0, 8); // flags
  cd.writeUInt16LE(0, 10); // method
  cd.writeUInt16LE(DOS_TIME, 12);
  cd.writeUInt16LE(DOS_DATE, 14);
  cd.writeUInt32LE(crc, 16);
  cd.writeUInt32LE(size, 20);
  cd.writeUInt32LE(size, 24);
  cd.writeUInt16LE(nameBuf.length, 28);
  cd.writeUInt16LE(0, 30); // extra
  cd.writeUInt16LE(0, 32); // comment
  cd.writeUInt16LE(0, 34); // disk
  cd.writeUInt16LE(0, 36); // internal attrs
  cd.writeUInt32LE(0, 38); // external attrs
  cd.writeUInt32LE(offset, 42); // local header offset
  central.push(cd, nameBuf);

  offset += local.length + nameBuf.length + dataBuf.length;
}

const localPart = Buffer.concat(locals);
const centralPart = Buffer.concat(central);
const eocd = Buffer.alloc(22);
eocd.writeUInt32LE(0x06054b50, 0);
eocd.writeUInt16LE(0, 4);
eocd.writeUInt16LE(0, 6);
eocd.writeUInt16LE(files.length, 8);
eocd.writeUInt16LE(files.length, 10);
eocd.writeUInt32LE(centralPart.length, 12);
eocd.writeUInt32LE(localPart.length, 16);
eocd.writeUInt16LE(0, 20);

const zip = Buffer.concat([localPart, centralPart, eocd]);
mkdirSync("public", { recursive: true });
writeFileSync("public/demo-results.xlsx", zip);
console.log(`Wrote public/demo-results.xlsx (${zip.length} bytes, ${files.length} parts, stored zip with CRC32).`);
