import { c as createComponent, r as renderComponent, g as renderScript, b as renderTemplate, m as maybeRenderHead } from '../chunks/astro/server_BxgriC_5.mjs';
import 'kleur/colors';
import { $ as $$DashboardLayout } from '../chunks/DashboardLayout_BPLTWs40.mjs';
/* empty css                                   */
export { renderers } from '../renderers.mjs';

const $$Content = createComponent(async ($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "DashboardLayout", $$DashboardLayout, { "title": "Content - MeshOS", "class": "astro-qh5muzdr" }, { "default": async ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="space-y-8 astro-qh5muzdr"> <!-- Header --> <div class="flex items-center justify-between astro-qh5muzdr"> <div class="astro-qh5muzdr"> <h1 class="text-3xl font-semibold text-text-primary mb-2 astro-qh5muzdr">Content Tracking</h1> <p class="text-text-secondary astro-qh5muzdr">
Track movies, shows, books, and get personalized recommendations
</p> </div> <div class="flex gap-3 astro-qh5muzdr"> <button id="import-enriched-btn" class="flex items-center px-4 py-2 bg-accent-purple text-white rounded-lg hover:bg-accent-purple/90 transition-colors astro-qh5muzdr"> <svg class="w-5 h-5 mr-2 astro-qh5muzdr" fill="none" stroke="currentColor" viewBox="0 0 24 24"> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" class="astro-qh5muzdr"></path> </svg>
Import Enriched Data
</button> <button id="refresh-content-btn" class="flex items-center px-4 py-2 bg-accent-primary text-white rounded-lg hover:bg-accent-primary/90 transition-colors astro-qh5muzdr"> <svg class="w-5 h-5 mr-2 astro-qh5muzdr" fill="none" stroke="currentColor" viewBox="0 0 24 24"> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" class="astro-qh5muzdr"></path> </svg>
Refresh
</button> </div> </div> <!-- Enhanced Content Dashboard Component --> <div id="content-dashboard-container" class="min-h-[400px] astro-qh5muzdr"> <!-- Loading state --> <div class="flex items-center justify-center h-64 astro-qh5muzdr"> <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 astro-qh5muzdr"></div> <span class="ml-3 text-text-secondary astro-qh5muzdr">Loading content dashboard...</span> </div> </div> <!-- Quick Import Section --> <div class="bg-surface border border-border rounded-lg p-6 astro-qh5muzdr"> <h2 class="text-xl font-semibold text-text-primary mb-4 astro-qh5muzdr">Serializd Enhanced Import</h2> <div class="grid grid-cols-1 md:grid-cols-2 gap-6 astro-qh5muzdr"> <div class="astro-qh5muzdr"> <h3 class="font-medium text-text-primary mb-2 astro-qh5muzdr">📊 Enriched Reviews</h3> <p class="text-text-muted text-sm mb-3 astro-qh5muzdr">
Import your enriched_Reviews.json with TMDB data, ratings, and detailed metadata
</p> <input type="file" id="enriched-reviews-input" accept=".json,.csv" class="hidden astro-qh5muzdr"> <button onclick="document.getElementById('enriched-reviews-input').click()" class="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors astro-qh5muzdr">
Select enriched_Reviews.json
</button> </div> <div class="astro-qh5muzdr"> <h3 class="font-medium text-text-primary mb-2 astro-qh5muzdr">📺 Enriched Watched Shows</h3> <p class="text-text-muted text-sm mb-3 astro-qh5muzdr">
Import your enriched_Watched_shows.json with comprehensive TV show metadata
</p> <input type="file" id="enriched-shows-input" accept=".json,.csv" class="hidden astro-qh5muzdr"> <button onclick="document.getElementById('enriched-shows-input').click()" class="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors astro-qh5muzdr">
Select enriched_Watched_shows.json
</button> </div> </div> <!-- Expected Format Info --> <div class="mt-6 p-4 bg-surface-hover rounded-lg border border-border astro-qh5muzdr"> <h4 class="font-medium text-text-primary mb-2 astro-qh5muzdr">✨ Enhanced Serializd Format Expected:</h4> <div class="text-sm text-text-muted space-y-1 astro-qh5muzdr"> <p class="astro-qh5muzdr"><strong class="astro-qh5muzdr">Required fields:</strong> Title, Rating, Watch_Date, TMDB_ID</p> <p class="astro-qh5muzdr"><strong class="astro-qh5muzdr">Enhanced fields:</strong> Genres, Cast, Overview, Season_Episode, Review_Text</p> </div> <div class="mt-3 text-sm text-text-muted astro-qh5muzdr"> <p class="astro-qh5muzdr"><strong class="astro-qh5muzdr">✨ This importer handles:</strong></p> <ul class="list-disc list-inside ml-4 space-y-1 mt-2 astro-qh5muzdr"> <li class="astro-qh5muzdr">Rich TMDB metadata (cast, genres, ratings)</li> <li class="astro-qh5muzdr">TV shows with season/episode tracking</li> <li class="astro-qh5muzdr">Personal reviews and ratings</li> <li class="astro-qh5muzdr">Duplicate detection and prevention</li> <li class="astro-qh5muzdr">Batch processing for large imports</li> </ul> </div> </div> </div> </div> ` })} ${renderScript($$result, "C:/Users/rahul/meshos-v3/src/pages/content.astro?astro&type=script&index=0&lang.ts")} `;
}, "C:/Users/rahul/meshos-v3/src/pages/content.astro", void 0);

const $$file = "C:/Users/rahul/meshos-v3/src/pages/content.astro";
const $$url = "/content";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Content,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
