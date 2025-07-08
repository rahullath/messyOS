export { renderers } from '../../../../renderers.mjs';

const GET = async ({ params }) => {
  const { tmdbid } = params;
  if (!tmdbid) {
    return new Response(JSON.stringify({ error: "TMDB ID required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
  try {
    const apiKey = "9d0ea2fac7a8b2c95fc301cf18981dfb";
    if (!apiKey) ;
    let posterPath = null;
    try {
      const movieResponse = await fetch(`https://api.themoviedb.org/3/movie/${tmdbid}?api_key=${apiKey}`);
      if (movieResponse.ok) {
        const movieData = await movieResponse.json();
        posterPath = movieData.poster_path;
      }
    } catch (error) {
      console.log("Not a movie, trying TV...");
    }
    if (!posterPath) {
      try {
        const tvResponse = await fetch(`https://api.themoviedb.org/3/tv/${tmdbid}?api_key=${apiKey}`);
        if (tvResponse.ok) {
          const tvData = await tvResponse.json();
          posterPath = tvData.poster_path;
        }
      } catch (error) {
        console.log("Not a TV show either");
      }
    }
    if (posterPath) {
      const fullPosterUrl = `https://image.tmdb.org/t/p/w300${posterPath}`;
      return new Response(JSON.stringify({
        success: true,
        posterUrl: fullPosterUrl,
        posterPath
      }), {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=86400"
          // Cache for 24 hours
        }
      });
    }
    return new Response(JSON.stringify({
      success: false,
      error: "No poster found"
    }), {
      status: 404,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("TMDB poster fetch error:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  GET
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
