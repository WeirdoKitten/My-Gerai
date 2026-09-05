const SLUG_SUFFIX_CHARSET = "abcdefghijklmnopqrstuvwxyz0123456789";
const DIACRITIC_MARKS = /[̀-ͯ]/g;

/** Ubah teks bebas jadi slug URL-safe (huruf kecil, angka, strip). */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(DIACRITIC_MARKS, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function randomSlugSuffix(length: number): string {
  let suffix = "";
  for (let i = 0; i < length; i++) {
    suffix +=
      SLUG_SUFFIX_CHARSET[
        Math.floor(Math.random() * SLUG_SUFFIX_CHARSET.length)
      ];
  }
  return suffix;
}
