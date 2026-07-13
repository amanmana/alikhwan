import * as fs from 'fs';
import * as path from 'path';

const USERS_SQL_PATH = path.resolve('users.sql');
const OUTPUT_DIR = path.resolve('output');
const OUTPUT_SQL_PATH = path.resolve('output/import_legacy_members.sql');

function parseSqlLine(line: string): string[] | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith('(')) return null;

  // Find where the values list ends (handling trailing commas/semicolons)
  let chars = trimmed.substring(1);
  if (chars.endsWith('),')) {
    chars = chars.substring(0, chars.length - 2);
  } else if (chars.endsWith(');')) {
    chars = chars.substring(0, chars.length - 2);
  } else if (chars.endsWith(')')) {
    chars = chars.substring(0, chars.length - 1);
  }

  const values: string[] = [];
  let inQuote = false;
  let current = '';
  let escape = false;

  for (let i = 0; i < chars.length; i++) {
    const char = chars[i];
    if (escape) {
      current += char;
      escape = false;
      continue;
    }
    if (char === '\\') {
      escape = true;
      continue;
    }
    if (char === "'") {
      inQuote = !inQuote;
      continue;
    }
    if (char === ',' && !inQuote) {
      values.push(current.trim());
      current = '';
      continue;
    }
    current += char;
  }
  values.push(current.trim());
  return values;
}

function cleanString(val: string): string {
  if (val === 'NULL' || val === 'null') return '';
  return val.replace(/^'|'$/g, '').trim();
}

function main() {
  console.log('=== Memulakan Proses Transformasi users.sql ===');

  if (!fs.existsSync(USERS_SQL_PATH)) {
    console.error(`Ralat: Fail 'users.sql' tidak ditemui di: ${USERS_SQL_PATH}`);
    process.exit(1);
  }

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR);
  }

  try {
    const content = fs.readFileSync(USERS_SQL_PATH, 'utf8');
    const lines = content.split('\n');
    
    const insertStatements: string[] = [];
    let recordCount = 0;
    
    const errors: string[] = ['legacy_id,full_name,reason'];
    const duplicates: string[] = ['legacy_id,full_name,count'];

    // SQL header
    insertStatements.push(
      '-- SQLite compatible legacy insert script\n' +
      'PRAGMA foreign_keys = ON;\n\n' +
      'DELETE FROM consent_records;\n' +
      'DELETE FROM audit_logs;\n' +
      'DELETE FROM member_sessions;\n' +
      'DELETE FROM admin_sessions;\n' +
      'DELETE FROM member_accounts;\n' +
      'DELETE FROM account_claims;\n' +
      'DELETE FROM correction_requests;\n' +
      'DELETE FROM members;\n' +
      'DELETE FROM members_fts;\n'
    );

    for (const line of lines) {
      if (!line.trim().startsWith('(')) continue;

      const parsed = parseSqlLine(line);
      if (!parsed || parsed.length < 33) continue;

      const legacyIdRaw = cleanString(parsed[0]);
      const legacyId = parseInt(legacyIdRaw, 10);
      const username = cleanString(parsed[1]);
      const fname = cleanString(parsed[2]);
      const lname = cleanString(parsed[3]);
      const address = cleanString(parsed[19]);
      const memberStatus = cleanString(parsed[31]); // 'active', 'moved', 'deceased'
      const createdRaw = cleanString(parsed[32]);

      // Skip the admin account
      if (username === 'admin' || legacyId === 1) continue;

      // Construct name
      const fullName = `${fname} ${lname}`.replace(/\s+/g, ' ').trim();
      if (!fullName) {
        errors.push(`${legacyIdRaw},[Nama Kosong],Tiada nama penuh dikesan`);
        continue;
      }

      // Map member status to active/moved/deceased kariah membership
      let membershipStatus = 'active';
      if (memberStatus === 'moved') {
        membershipStatus = 'moved';
      } else if (memberStatus === 'deceased') {
        membershipStatus = 'deceased';
      }

      const memberUuid = `legacy-uuid-${legacyId}`;
      const legacyIdString = `LEG-${legacyId.toString().padStart(3, '0')}`;
      const addressString = address || 'Kariah Al-Ikhwan';
      const createdIso = createdRaw ? new Date(createdRaw).toISOString() : new Date().toISOString();
      const updatedIso = new Date().toISOString();

      // SQLite insert command
      const stmt = `INSERT INTO members (id, legacy_id, full_name, full_name_normalized, ic_normalized, ic_last4, birth_date, phone_normalized, address, general_area, membership_status, account_state, directory_visible, directory_consent_at, registration_source, admin_notes, created_at, updated_at) VALUES ('${memberUuid}', '${legacyIdString}', '${fullName.replace(/'/g, "''")}', '${fullName.toUpperCase().replace(/'/g, "''")}', NULL, NULL, NULL, NULL, '${addressString.replace(/'/g, "''")}', NULL, '${membershipStatus}', 'unclaimed', 0, NULL, 'legacy_import', 'Diimport dari users.sql', '${createdIso}', '${updatedIso}');`;
      
      insertStatements.push(stmt);
      
      // Sync into search virtual index table
      const ftsStmt = `INSERT INTO members_fts (member_id, full_name_normalized) VALUES ('${memberUuid}', '${fullName.toUpperCase().replace(/'/g, "''")}');`;
      insertStatements.push(ftsStmt);

      recordCount++;
    }

    // Write SQLite D1 script
    fs.writeFileSync(OUTPUT_SQL_PATH, insertStatements.join('\n'));
    fs.writeFileSync(path.join(OUTPUT_DIR, 'import-errors.csv'), errors.join('\n'));
    fs.writeFileSync(path.join(OUTPUT_DIR, 'import-duplicates.csv'), duplicates.join('\n'));

    console.log(`\nTransformasi Berjaya!`);
    console.log(`- Jumlah rekod kariah lama ditukarkan: ${recordCount} ahli`);
    console.log(`- Fail SQL SQLite bersedia di: ${OUTPUT_SQL_PATH}`);
  } catch (err: any) {
    console.error('Ralat semasa membaca/menukar SQL:', err.message);
    process.exit(1);
  }
}

main();
