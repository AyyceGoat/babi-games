/**
 * Melange uniforme.
 *
 * Remplace les cinq occurrences de `sort(() => 0.5 - Math.random())`
 * relevees dans DIAGNOSTIC.md E.2. Ce comparateur non transitif ne produit
 * pas une permutation uniforme : mesure sur 200 000 tirages de 8 elements,
 * le premier element finissait en tete dans 22,28 % des cas au lieu de
 * 12,50 %, soit un ecart de 14 points. Concretement Didi B, Drogba et le
 * Garba sortaient nettement plus souvent que les autres, ce qui accentuait
 * la repetition sur des pools deja courts.
 *
 * Fisher-Yates donne une permutation uniforme.
 */

export function shuffle(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Tire `count` elements distincts, uniformement. */
export function sample(list, count) {
  return shuffle(list).slice(0, count);
}
