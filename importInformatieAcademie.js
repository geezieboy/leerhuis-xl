// Informatie Academie importer voor Leerhuis XL
// Voer uit met: node importInformatieAcademie.js

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://psgfrktwcpzbqmazvpst.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBzZ2Zya3R3Y3B6YnFtYXp2cHN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxNDYxODMsImV4cCI6MjA4ODcyMjE4M30.zmMsoM7IEuepS5SDqn7Ani6EFAOgavf7_8qm7ya_Jq8'
);

const VENDOR = 'Informatie Academie';

const courses = [
  {
    title: 'Open Donderdagen – Informatie Academie',
    description: 'Eén keer per maand komen professionals vanuit de hele overheid bij elkaar om zich te laten inspireren over hoe we de overheid transparanter en beter kunnen organiseren. Elke Open Donderdag staat één thema centraal, met afwisselende sprekers en een netwerkborrel. Komende data: 2 april, 4 juni, 2 juli 2026.',
    topic: 'Organisatiecultuur en gedragsverandering',
    werkvorm: 'Netwerkborrel',
    doelgroep: 'Rijksmedewerker',
    duration: 'Maandelijks',
    is_free: true,
    language: 'NL',
    enroll_url: 'https://www.rijksorganisatieodi.nl/informatie-academie/open-donderdagen',
    extern_id: 'ia-open-donderdagen',
  },
];

async function main() {
  console.log('🟠 Informatie Academie importer gestart...');

  const { error: deleteError } = await supabase.from('courses').delete().eq('vendor', VENDOR);
  if (deleteError) { console.error('❌ Verwijderen mislukt:', deleteError.message); return; }
  console.log('✅ Oude Informatie Academie cursussen verwijderd');

  const records = courses.map(c => ({ ...c, vendor: VENDOR }));
  const { error } = await supabase.from('courses').insert(records);
  if (error) { console.error('❌ Import mislukt:', error.message); return; }

  console.log(`\n🎉 Klaar! ${records.length} Informatie Academie activiteit geïmporteerd.`);
}

main();
