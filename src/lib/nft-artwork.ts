// Original exports supplied from the challenge's Figma file.
export const nftArtwork = {
  emerald: "/images/nfts/emerald-ape.png",
  nomad: "/images/nfts/violet-nomad.png",
  ivory: "/images/nfts/ivory-baron.png",
  golden: "/images/nfts/golden-beat.png",
} as const;

// Different catalog editions share the same four artworks in the design.
export const catalogArtwork = [
  nftArtwork.emerald,
  nftArtwork.nomad,
  nftArtwork.ivory,
  nftArtwork.nomad,
  nftArtwork.golden,
  nftArtwork.golden,
];

export function originalArtwork(image: string): string {
  const legacy = /^\/images\/nfts\/sample-([1-6])\.svg$/.exec(image);
  return legacy ? catalogArtwork[Number(legacy[1]) - 1] : image;
}
