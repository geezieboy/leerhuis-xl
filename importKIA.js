// KIA importer voor Leerhuis XL
// Voer uit met: node importKIA.js

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://psgfrktwcpzbqmazvpst.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBzZ2Zya3R3Y3B6YnFtYXp2cHN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxNDYxODMsImV4cCI6MjA4ODcyMjE4M30.zmMsoM7IEuepS5SDqn7Ani6EFAOgavf7_8qm7ya_Jq8'
);

const VENDOR = 'KIA';

const courses = [

  // --- CLUSTERS ---

  {
    title: 'Dertiende week Grip op Informatie (VNG)',
    description: 'Jaarlijkse themaweek van VNG Realisatie met meerdere online sessies over informatiehuishouding bij gemeenten. Onderwerpen: DUTO-quickscan, OneNote & Teams, AI en IHH, selectiebesluit 2027, omvangrijke Woo-verzoeken, organisatieverandering en AI-richtlijn gemeenteraden. Sessies vinden plaats op 9, 13, 14, 15 en 16 april 2026.',
    topic: 'Archiveren en beheren',
    werkvorm: 'Bijeenkomst',
    doelgroep: 'Informatieprofessional',
    enroll_url: 'https://kiacommunity.nl/calendar_events',
    extern_id: 'kia-grip-week-13',
    expiry_date: '2026-04-17',
    is_free: true,
  },
  {
    title: 'Digitale sessie projectleiders Woo (VNG)',
    description: 'Terugkerende online bijeenkomst van VNG Realisatie voor projectleiders Woo bij gemeenten en gemeenschappelijke regelingen. Kennis en ervaringen uitwisselen, vragen stellen en praktijkverhalen van gemeenten. Komende data: 12 mei, 9 juli, 16 september, 9 november 2026.',
    topic: 'Openbaar maken',
    werkvorm: 'Bijeenkomst',
    doelgroep: 'Informatieprofessional',
    enroll_url: 'https://kiacommunity.nl/calendar_events',
    extern_id: 'kia-woo-projectleiders',
    expiry_date: '2026-11-10',
    is_free: true,
  },
  {
    title: 'Digitaal spreekuur: Ervaring opdoen actieve openbaarmaking',
    description: 'Terugkerend digitaal spreekuur van RDDI, KOOP en programma Open Overheid. Stel vragen over het actief openbaar maken van informatie en de 17 verplichte informatiecategorieën via de generieke Woo-voorziening. Bedoeld voor alle organisaties onder de Wet open overheid. Komende data: 26 maart, 14 april 2026.',
    topic: 'Openbaar maken',
    werkvorm: 'Spreekuur',
    doelgroep: 'Informatieprofessional',
    enroll_url: 'https://www.open-overheid.nl/actueel/agenda/',
    extern_id: 'kia-spreekuur-openbaarmaking',
    expiry_date: '2026-04-15',
    is_free: true,
  },

  // --- UNIEKE EVENEMENTEN ---

  {
    title: 'DUTO-dag: Praktisch aan de slag met duurzaam toegankelijke overheidsinformatie',
    description: 'Nationaal Archief helpt informatieprofessionals bij de overheid concreet aan de slag gaan met DUTO. Inzicht in wat DUTO betekent voor jouw organisatie, welke hulpmiddelen beschikbaar zijn en hoe je de eerste stap zet. Ruimte voor kennisuitwisseling met collega\'s. 19 maart 2026, Nationaal Archief Den Haag.',
    topic: 'Archiveren en beheren',
    werkvorm: 'Bijeenkomst',
    doelgroep: 'Informatieprofessional',
    enroll_url: 'https://kiacommunity.nl/calendar_events/4432',
    extern_id: 'kia-duto-dag-2026',
    expiry_date: '2026-03-20',
    is_free: true,
  },
  {
    title: 'AVA_Net Kennisbijeenkomst Oral History',
    description: 'AVA_Net en Knooppunt Oral History organiseren een kennisbijeenkomst over toegankelijkheid en hergebruik van oral history-collecties. Technische en inhoudelijke uitdagingen rond oral history worden verkend. 25 maart 2026, Beeld & Geluid Hilversum.',
    topic: 'Archiveren en beheren',
    werkvorm: 'Bijeenkomst',
    doelgroep: 'Informatieprofessional',
    enroll_url: 'https://kiacommunity.nl/calendar_events/4400',
    extern_id: 'kia-avanet-oral-history',
    expiry_date: '2026-03-26',
    is_free: true,
  },
  {
    title: 'Casusbespreking Samen Slimmer: NIS2 en de rol van de archivaris',
    description: 'Tweede casusbespreking in de reeks Samen Slimmer. Actuele praktijkcasus rondom NIS2: de verschuiving van compliance naar crisisbeheersing en wat dit betekent voor de rol van de archivaris. 7 april 2026, online via Teams.',
    topic: 'Archiveren en beheren',
    werkvorm: 'Bijeenkomst',
    doelgroep: 'Informatieprofessional',
    enroll_url: 'https://kiacommunity.nl/calendar_events/4492',
    extern_id: 'kia-samen-slimmer-nis2',
    expiry_date: '2026-04-08',
    is_free: true,
  },
  {
    title: 'VOGIN-IP-lezing 2026',
    description: 'Jaarlijks congres over zoeken, vinden en vindbaar maken van informatie. Met 2 keynotes, 6 lezingen en 11 workshops. Sprekers: Martijn Kleppe, Astrid van Wesenbeeck en Felienne Hermans. 9 april 2026, OBA Amsterdam.',
    topic: 'Professionele vaardigheden',
    werkvorm: 'Congres',
    doelgroep: 'Informatieprofessional',
    enroll_url: 'https://vogin-ip-lezing.net/programma-2026/',
    extern_id: 'kia-vogin-ip-2026',
    expiry_date: '2026-04-10',
    is_free: false,
  },
  {
    title: 'Digitaal spreekuur Draagvlak voor DUTO',
    description: 'Online sessie van het Nationaal Archief waar je vragen kunt stellen over DUTO-risicobeoordeling. De DUTO-risicobeoordeling helpt inzicht te krijgen in risico\'s en kansen op het gebied van duurzame toegankelijkheid van overheidsinformatie. 21 april 2026, online.',
    topic: 'Archiveren en beheren',
    werkvorm: 'Spreekuur',
    doelgroep: 'Informatieprofessional',
    enroll_url: 'https://kiacommunity.nl/calendar_events/4552',
    extern_id: 'kia-spreekuur-duto',
    expiry_date: '2026-04-22',
    is_free: true,
  },
  {
    title: 'Dataverse Community Meeting 2026',
    description: 'Internationale conferentie rond AI-oplossingen voor data, interoperabiliteit en gevoelige data in repositories. Thema: "Advancing Data and Dataverse: AI, Interoperability, and Sensitive Data". 12-15 mei 2026, Barcelona.',
    topic: 'Archiveren en beheren',
    werkvorm: 'Congres',
    doelgroep: 'Informatieprofessional',
    enroll_url: 'https://dcm2026.com/',
    extern_id: 'kia-dataverse-2026',
    expiry_date: '2026-05-16',
    is_free: false,
  },
  {
    title: 'Symposium Veilig Verpakt',
    description: 'Symposium bij de KB over verpakken van archieven en collecties. Presentatie van het Handboek over verpakken gericht op behoud. Alles over soorten verpakkingen, waarom verpakken belangrijk is en creatieve oplossingen. 16 juni 2026.',
    topic: 'Archiveren en beheren',
    werkvorm: 'Congres',
    doelgroep: 'Informatieprofessional',
    enroll_url: 'https://kiacommunity.nl/calendar_events/4468',
    extern_id: 'kia-veilig-verpakt',
    expiry_date: '2026-06-17',
    is_free: true,
  },
  {
    title: 'AVA_Net Symposium 2026',
    description: 'Jaarlijks symposium van AVA_Net over audiovisueel erfgoed. Thema 2026: weerbaarheid van audiovisueel erfgoed. 25 juni 2026, Beeld & Geluid Hilversum.',
    topic: 'Archiveren en beheren',
    werkvorm: 'Congres',
    doelgroep: 'Informatieprofessional',
    enroll_url: 'https://www.avanet.nl/evenementen/symposium-2026/',
    extern_id: 'kia-avanet-symposium-2026',
    expiry_date: '2026-06-26',
    is_free: false,
  },
  {
    title: 'Vergadering Standaardisatieraad Nationaal Archief',
    description: 'Terugkerende vergadering van de standaardisatieraad, die de belangen vertegenwoordigt van gebruikers van kennisproducten van het Nationaal Archief (normen, informatiebladen, handleidingen). Open voor geïnteresseerden. Komende data: 9 juni, 7 september, 24 november 2026.',
    topic: 'Archiveren en beheren',
    werkvorm: 'Bijeenkomst',
    doelgroep: 'Informatieprofessional',
    enroll_url: 'https://kiacommunity.nl/calendar_events',
    extern_id: 'kia-standaardisatieraad-na',
    expiry_date: '2026-11-25',
    is_free: true,
  },
];

const records = courses.map(c => ({ ...c, vendor: VENDOR, language: 'NL' }));

async function main() {
  console.log('🔵 KIA importer gestart...');

  const { error: deleteError } = await supabase.from('courses').delete().eq('vendor', VENDOR);
  if (deleteError) { console.error('❌ Verwijderen mislukt:', deleteError.message); return; }
  console.log('✅ Oude KIA cursussen verwijderd');

  const { error } = await supabase.from('courses').insert(records);
  if (error) { console.error('❌ Import mislukt:', error.message); return; }

  console.log(`\n🎉 Klaar! ${records.length} KIA activiteiten geïmporteerd.`);
}

main();
