// Podcast classificeerder voor Leerhuis XL
// Voer uit met: node classificeerPodcasts.js

import { createClient } from '@supabase/supabase-js';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const supabase = createClient(
  'https://psgfrktwcpzbqmazvpst.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBzZ2Zya3R3Y3B6YnFtYXp2cHN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxNDYxODMsImV4cCI6MjA4ODcyMjE4M30.zmMsoM7IEuepS5SDqn7Ani6EFAOgavf7_8qm7ya_Jq8'
);

const THEMAS = [
  "Archiveren en beheren",
  "Meten en verbeteren",
  "Openbaar maken",
  "Organisatiecultuur en gedragsverandering",
  "Professionele vaardigheden",
];

const DOELGROEPEN = [
  "Informatieprofessional",
  "Leidinggevende",
  "Rijksmedewerker",
];

async function classificeer(titel, beschrijving) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 100,
      messages: [{
        role: 'user',
        content: `Je bent een classificeerder voor een leerplatform van de Rijksoverheid over informatiehuishouding.

Classificeer deze podcast aflevering:
Titel: ${titel}
${beschrijving ? `Beschrijving: ${beschrijving}` : `Geen beschrijving beschikbaar. Gebruik alleen de titel om te classificeren. De titel bevat vaak de naam van de gast en zijn/haar organisatie.`}

Kies exact één thema uit: ${THEMAS.join(', ')}
Kies exact één doelgroep uit: ${DOELGROEPEN.join(', ')}

Antwoord ALLEEN in dit formaat (niets anders):
THEMA: [thema]
DOELGROEP: [doelgroep]`
      }]
    })
  });
  const data = await response.json();
  const tekst = data.content[0].text;
  const thema = tekst.match(/THEMA: (.+)/)?.[1]?.trim();
  const doelgroep = tekst.match(/DOELGROEP: (.+)/)?.[1]?.trim();
  return { thema, doelgroep };
}

async function main() {
  console.log('🤖 Podcast classificeerder gestart...\n');

  // Haal alle podcasts op
  const { data: podcasts, error } = await supabase
    .from('courses')
    .select('id, title, description')
    .eq('werkvorm', 'Podcast');

  if (error) { console.error('❌ Fout:', error.message); return; }
  console.log(`✅ ${podcasts.length} podcasts gevonden\n`);

  let bijgewerkt = 0;

  for (const podcast of podcasts) {
    try {
      const { thema, doelgroep } = await classificeer(podcast.title, podcast.description);

      if (!THEMAS.includes(thema) || !DOELGROEPEN.includes(doelgroep)) {
        console.log(`⚠️  Ongeldig resultaat voor: ${podcast.title}`);
        continue;
      }

      await supabase.from('courses').update({ topic: thema, doelgroep }).eq('id', podcast.id);
      console.log(`✅ ${podcast.title}`);
      console.log(`   → ${thema} | ${doelgroep}\n`);
      bijgewerkt++;

      // Kleine pauze om rate limits te vermijden
      await new Promise(r => setTimeout(r, 300));
    } catch (err) {
      console.error(`❌ Fout bij ${podcast.title}:`, err.message);
    }
  }

  console.log(`\n🎉 Klaar! ${bijgewerkt} podcasts bijgewerkt.`);
}

main();
