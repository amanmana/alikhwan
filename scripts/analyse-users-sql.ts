import * as fs from 'fs';
import * as path from 'path';

const USERS_SQL_PATH = path.resolve('users.sql');

function main() {
  console.log('=== Analisis users.sql Legacy Import ===');
  
  if (!fs.existsSync(USERS_SQL_PATH)) {
    console.warn(`[PERINGATAN] Fail 'users.sql' tidak ditemui di root projek.`);
    console.log(`Sila salin fail 'users.sql' ke: ${USERS_SQL_PATH}`);
    console.log(`Selepas itu, jalankan semula arahan ini untuk menganalisis skema dan data.`);
    return;
  }

  try {
    const content = fs.readFileSync(USERS_SQL_PATH, 'utf8');
    const lines = content.split('\n');
    console.log(`Fail 'users.sql' ditemui. Panjang fail: ${lines.length} baris.`);

    // Analyze basic keywords
    const isMySQL = content.toLowerCase().includes('engine=') || content.toLowerCase().includes('insert into `');
    const tableMatches = content.match(/create table\s+`?(\w+)`?/gi);

    console.log(`Dialek SQL dijangka: ${isMySQL ? 'MySQL (Memerlukan pertukaran skema ke SQLite)' : 'SQLite / Generic SQL'}`);
    if (tableMatches) {
      console.log('Jadual (Tables) yang dikesan dalam fail:');
      tableMatches.forEach(t => console.log(`  - ${t.replace(/create table\s+/i, '')}`));
    }

    // Check for IC matching patterns
    // E.g. YYMMDD-XX-XXXX (14 chars) or YYMMDDXXXXXX (12 digits)
    const icPattern = /\b\d{6}-?\d{2}-?\d{4}\b/g;
    const icMatches = content.match(icPattern) || [];
    console.log(`Jumlah No. IC dikesan: ${icMatches.length}`);

    // Deduplicate IC matches
    const uniqueIcs = new Set(icMatches.map(ic => ic.replace(/[^\d]/g, '')));
    console.log(`Jumlah No. IC unik: ${uniqueIcs.size}`);
    console.log(`Sebab bertindih / Duplikasi IC: ${icMatches.length - uniqueIcs.size}`);

    console.log('\nAnalisis Selesai. Sila rujuk docs/import-plan.md untuk langkah transformasi.');
  } catch (err: any) {
    console.error('Ralat membaca fail SQL:', err.message);
  }
}

main();
