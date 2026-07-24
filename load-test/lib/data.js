import http from 'k6/http';

// Resolves real catalog data at runtime instead of hardcoding seeded IDs —
// seeded IDs are UUID-shaped and not stable across environments/re-seeds.
// Call this once from setup(), never from inside a per-iteration function.
export function loadCatalog(baseUrl) {
  const citiesRes = http.get(`${baseUrl}/api/cities`, { tags: { name: 'setup_load_catalog' } });
  const moviesRes = http.get(`${baseUrl}/api/movies`, { tags: { name: 'setup_load_catalog' } });

  if (citiesRes.status !== 200 || moviesRes.status !== 200) {
    throw new Error(
      `Catalog fetch failed (cities: ${citiesRes.status}, movies: ${moviesRes.status}) — ` +
      'is BASE_URL correct and is the backend up?'
    );
  }

  const cities = citiesRes.json();
  const movies = moviesRes.json();

  if (!Array.isArray(cities) || cities.length === 0) {
    throw new Error('No cities seeded — run `npm run db:seed` against this DB before load-testing.');
  }
  if (!Array.isArray(movies) || movies.length === 0) {
    throw new Error('No movies seeded — run `npm run db:seed` against this DB before load-testing.');
  }

  return { cities, movies };
}

export function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Walks the seeded catalog via the public API (never the DB directly — see
// reference/k6-scripting-conventions.md) to find one show that still has at
// least one available seat, for the dedicated seat-hold contention scenario.
// Stops at the first hit rather than scanning all ~750 seeded shows.
export function findContentionTarget(baseUrl, catalog) {
  for (const city of catalog.cities) {
    const moviesRes = http.get(`${baseUrl}/api/movies/city/${city.id}`, { tags: { name: 'setup_find_target' } });
    if (moviesRes.status !== 200) continue;
    const movies = moviesRes.json();

    for (const movie of movies) {
      const showsRes = http.get(`${baseUrl}/api/shows/movie/${movie.id}?cityId=${city.id}`, {
        tags: { name: 'setup_find_target' },
      });
      if (showsRes.status !== 200) continue;
      const shows = showsRes.json();

      for (const show of shows) {
        const seatmapRes = http.get(`${baseUrl}/api/shows/${show.id}/seatmap`, {
          tags: { name: 'setup_find_target' },
        });
        if (seatmapRes.status !== 200) continue;
        const seats = seatmapRes.json();
        const open = seats.filter((s) => s.status === 'available');
        if (open.length > 0) {
          return { showId: show.id, seatId: open[0].seatId };
        }
      }
    }
  }

  throw new Error(
    'Could not find any seeded show with an available seat to contend over — is the DB seeded ' +
    '(npm run db:seed) and not fully sold out?'
  );
}
