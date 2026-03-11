// RADIO Leerplatform importer voor Leerhuis XL
// Voer uit met: node importRADIO.js

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://psgfrktwcpzbqmazvpst.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBzZ2Zya3R3Y3B6YnFtYXp2cHN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxNDYxODMsImV4cCI6MjA4ODcyMjE4M30.zmMsoM7IEuepS5SDqn7Ani6EFAOgavf7_8qm7ya_Jq8'
);

const VENDOR = 'RADIO';

// Handmatig opgebouwd uit de 3 pagina's — dubbelingen met Leerhuis IH verwijderd
const courses = [
  // Informatiehuishouding
  {
    title: 'Werken met Digidoc Online',
    description: 'Ontdek hoe je kunt werken met Digidoc Online (opvolger van de desktopversie). Leer hoe je nieuwe documenten maakt en beheert en hoe de stukkenstroom werkt.',
    topic: 'Archiveren en beheren',
    werkvorm: 'E-learning',
    doelgroep: 'Informatieprofessional',
    enroll_url: 'https://leerplatform.it-academieoverheid.nl/course/view.php?id=53',
    extern_id: 'radio-53',
  },
  {
    title: 'Werken met Digidoc Desktop',
    description: 'Als je record management of archiefwerkzaamheden doet, is het handig om te leren werken met Digidoc Desktop.',
    topic: 'Archiveren en beheren',
    werkvorm: 'E-learning',
    doelgroep: 'Informatieprofessional',
    enroll_url: 'https://leerplatform.it-academieoverheid.nl/course/view.php?id=45',
    extern_id: 'radio-45',
  },
  {
    title: 'Onboarding: omgaan met overheidsinformatie voor leidinggevenden',
    description: 'Ontdek hoe jij als leidinggevende bijdraagt aan een goede informatiehuishouding, hoe je het inzet voor je team en jouw werk binnen een open overheid.',
    topic: 'Organisatiecultuur en gedragsverandering',
    werkvorm: 'E-learning',
    doelgroep: 'Leidinggevende',
    enroll_url: 'https://leerplatform.it-academieoverheid.nl/course/view.php?id=52',
    extern_id: 'radio-52',
  },
  {
    title: 'Grip op informatie',
    description: 'Ontdek hoe je bij medeoverheden grip houdt op jouw informatiehuishouding vanuit de Wet open overheid (Woo) en de (herziene) Archiefwet.',
    topic: 'Archiveren en beheren',
    werkvorm: 'E-learning',
    doelgroep: 'Informatieprofessional',
    enroll_url: 'https://leerplatform.it-academieoverheid.nl/course/view.php?id=55',
    extern_id: 'radio-55',
  },
  // AI en Data
  {
    title: 'Basisopleiding AI en Data',
    description: 'Leer wat AI en generatieve AI is, welke kansen en risico\'s er zijn en hoe je daar mee om moet gaan.',
    topic: 'Archiveren en beheren',
    werkvorm: 'E-learning',
    doelgroep: 'Rijksmedewerker',
    enroll_url: 'https://leerplatform.it-academieoverheid.nl/course/view.php?id=70',
    extern_id: 'radio-70',
  },
  {
    title: 'Non-discriminatie in algoritmes en data',
    description: 'Kom meer te weten over non-discriminatie in AI, algoritmes en data. Leer essentiële elementen over gelijkebehandelingswetgeving en hoe deze toegepast worden in AI en algoritmes.',
    topic: 'Archiveren en beheren',
    werkvorm: 'E-learning',
    doelgroep: 'Rijksmedewerker',
    enroll_url: 'https://leerplatform.it-academieoverheid.nl/course/view.php?id=58',
    extern_id: 'radio-58',
  },
  {
    title: 'Datagedreven werken',
    description: 'Je kunt data uit allerlei bronnen inzetten voor analyse van beleidsvragen, onderbouwen van beleidsoplossingen of sturen op basis van data.',
    topic: 'Archiveren en beheren',
    werkvorm: 'E-learning',
    doelgroep: 'Rijksmedewerker',
    enroll_url: 'https://leerplatform.it-academieoverheid.nl/course/view.php?id=5',
    extern_id: 'radio-5',
  },
];

// Voeg vaste velden toe
const records = courses.map(c => ({
  ...c,
  vendor: VENDOR,
  language: 'NL',
  is_free: true,
  duration: '',
}));

async function main() {
  console.log('🔴 RADIO importer gestart...');

  // Verwijder bestaande RADIO cursussen
  const { error: deleteError } = await supabase.from('courses').delete().eq('vendor', VENDOR);
  if (deleteError) { console.error('❌ Verwijderen mislukt:', deleteError.message); return; }
  console.log('✅ Oude RADIO cursussen verwijderd');

  // Importeer nieuwe cursussen
  const { error } = await supabase.from('courses').insert(records);
  if (error) { console.error('❌ Import mislukt:', error.message); return; }

  console.log(`\n🎉 Klaar! ${records.length} RADIO cursussen geïmporteerd.`);
}

main();
