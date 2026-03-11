// Spotify Podcast Importer voor Leerhuis XL
// Voer uit met: node importSpotify.js

import { createClient } from '@supabase/supabase-js';

const SPOTIFY_CLIENT_ID = 'bebdc60f6ed9497a80613c61a4e6c8ad';
const SPOTIFY_CLIENT_SECRET = 'db2d3eb9d9354901846d868b86fcd45f';
const SHOW_ID = '6oJsjZsAiunyNsDK1g9QzK';
const VENDOR = 'Leerhuis Informatiehuishouding';

const supabase = createClient(
  'https://psgfrktwcpzbqmazvpst.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBzZ2Zya3R3Y3B6YnFtYXp2cHN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxNDYxODMsImV4cCI6MjA4ODcyMjE4M30.zmMsoM7IEuepS5SDqn7Ani6EFAOgavf7_8qm7ya_Jq8'
);

async function getSpotifyToken() {
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64'),
    },
    body: 'grant_type=client_credentials',
  });
  const data = await response.json();
  return data.access_token;
}

async function getAllEpisodes(token) {
  let episodes = [];
  let url = `https://api.spotify.com/v1/shows/${SHOW_ID}/episodes?limit=50&market=NL`;

  while (url) {
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const data = await response.json();
    episodes = episodes.concat(data.items);
    url = data.next;
  }
  return episodes;
}

function cleanDescription(desc) {
  if (!desc) return '';
  const generiek = 'Jouw vakkennis up-to-date houden?';
  const idx = desc.indexOf(generiek);
  // Knip de generieke zin weg als die voorkomt, neem wat ervoor staat
  const cleaned = idx > 0 ? desc.slice(0, idx).trim() : desc.trim();
  // Als er niks overblijft, geef lege string terug
  return cleaned.slice(0, 500);
}

async function main() {
  console.log('🎙️ Spotify podcast importer gestart...');

  // Stap 1: Token ophalen
  const token = await getSpotifyToken();
  console.log('✅ Spotify token opgehaald');

  // Stap 2: Alle afleveringen ophalen
  const episodes = await getAllEpisodes(token);
  console.log(`✅ ${episodes.length} afleveringen gevonden`);

  // Stap 3: Omzetten naar Supabase formaat
  const courses = episodes.map(ep => ({
    title: ep.name,
    description: cleanDescription(ep.description),
    vendor: VENDOR,
    topic: 'Professionele vaardigheden',
    duration: ep.duration_ms ? `${Math.round(ep.duration_ms / 60000)} minuten` : '',
    language: 'NL',
    is_free: true,
    enroll_url: ep.external_urls?.spotify || '',
    werkvorm: 'Podcast',
    doelgroep: 'Rijksmedewerker',
    extern_id: ep.id,
  }));

  // Stap 4: Bestaande podcasts verwijderen
  const { error: deleteError } = await supabase
    .from('courses')
    .delete()
    .eq('vendor', VENDOR)
    .eq('werkvorm', 'Podcast');

  if (deleteError) {
    console.error('❌ Verwijderen mislukt:', deleteError.message);
    return;
  }
  console.log('✅ Oude podcasts verwijderd');

  // Stap 5: Importeren in batches
  let inserted = 0;
  for (let i = 0; i < courses.length; i += 20) {
    const batch = courses.slice(i, i + 20);
    const { error } = await supabase.from('courses').insert(batch);
    if (error) console.error(`❌ Batch fout:`, error.message);
    else inserted += batch.length;
  }

  console.log(`\n🎉 Klaar! ${inserted} podcasts geïmporteerd in Supabase.`);
}

main();
