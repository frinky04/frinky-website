export function createModel(content) {
  const posts = content?.posts || [];
  const games = content?.games || [];
  const featured = content?.featured || games.find((item) => item.featured) || games[0] || null;

  const home = content?.home || {
    title: "Home",
    summary: "Frinky's portfolio of games, updates, and development posts.",
    contentHtml:
      "<p>Weclome to my website. I like to make silly little games. I also like producing music in my spare time. My favorite genre's are horror and shooters.</p><p>Check out some of the game's I've made.</p>",
  };

  const about = content?.about || {
    name: "Finn Rawlings (Frinky)",
    birthDate: "24 Sep 2004",
    image: "/images/frog.png",
    imageAlt: "Frog illustration for Finn Rawlings",
    contentHtml:
      "<p>I'm from Australia.</p><p>Like to make games, I also like playing games. Big fan of Horror and FPS.</p><p>I like to make music in my spare time.</p>",
  };

  const experience = content?.experience || [
    {
      date: "2022 - 2025",
      title: "Full-time Remote Programmer & Gameplay Designer",
      meta: "Transience @ RESURGENT",
      order: 1,
    },
  ];

  const site = content?.site || {
    name: "Frinky",
    description: home.summary,
    url: "https://frinky.org",
    author: "Finn Rawlings",
  };

  function findEntry(type, slug) {
    const collection = type === "game" ? games : posts;
    return collection.find((item) => item.slug === slug);
  }

  return {
    site,
    posts,
    games,
    featured,
    experience,
    home,
    about,
    maxPosts: 8,
    findEntry,
  };
}
