import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL } from '../config.js';
import { pickRandom } from '../lib/data.js';

// The read-heavy, anonymous part of the traffic mix: browse movies playing
// in a city, view a movie's detail, list its shows. Matches this app's
// public GETs (server/routes/movies.ts, shows.ts).
export function browse(catalog) {
  const city = pickRandom(catalog.cities);

  let res = http.get(`${BASE_URL}/api/movies/city/${city.id}`, { tags: { name: 'browse_movies' } });
  check(res, { 'browse movies 200': (r) => r.status === 200 });
  const cityMovies = res.status === 200 ? res.json() : [];
  const movie = pickRandom(cityMovies.length ? cityMovies : catalog.movies);

  res = http.get(`${BASE_URL}/api/movies/${movie.id}`, { tags: { name: 'get_movie' } });
  check(res, { 'get movie 200': (r) => r.status === 200 });

  res = http.get(`${BASE_URL}/api/shows/movie/${movie.id}?cityId=${city.id}`, { tags: { name: 'browse_shows' } });
  check(res, { 'browse shows 200': (r) => r.status === 200 });
  const shows = res.status === 200 ? res.json() : [];

  sleep(Math.random() * 2 + 1); // think time between page views

  return { city, movie, shows };
}
