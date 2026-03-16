export function createModel(content) {
  const posts = content?.posts || [];
  const games = content?.games || [];
  const featured = content?.featured || games.find((item) => item.featured) || games[0] || null;

  const experience = [
    {
      date: "2022 - 2025",
      title: "Full-time Remote Programmer & Gameplay Designer",
      meta: "Transience @ RESURGENT",
    },
  ];

  const site = content?.site || {
    name: "Frinky",
    description: "Frinky's portfolio of games, updates, and development posts.",
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
    maxPosts: 8,
    findEntry,
  };
}
