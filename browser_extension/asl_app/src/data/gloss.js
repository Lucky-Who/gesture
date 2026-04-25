export function createGloss(getUserSigns) {
  const DROP = new Set([
    "a",
    "an",
    "the",
    "is",
    "are",
    "am",
    "was",
    "were",
    "be",
    "been",
    "being",
    "at",
    "in",
    "on",
    "of",
    "for",
    "with",
    "and",
    "but",
    "or",
    "to",
    "it",
  ]);

  const DICT = {
    hello: "HELLO",
    hi: "HELLO",
    hey: "HELLO",
    yes: "YES",
    yeah: "YES",
    yep: "YES",
    no: "NO",
    nope: "NO",
    not: "NO",
    thank: "THANK_YOU",
    thanks: "THANK_YOU",
    "thank you": "THANK_YOU",
    please: "PLEASE",
    sorry: "SORRY",
    excuse: "SORRY",
    help: "HELP",
    love: "LOVE",
    i: "I",
    me: "ME",
    you: "YOU",
    your: "YOUR",
    my: "MY",
    what: "WHAT",
    where: "WHERE",
    know: "KNOW",
    think: "THINK",
    good: "GOOD",
    great: "GREAT",
    awesome: "GREAT",
    bad: "BAD",
    want: "WANT",
    need: "NEED",
    understand: "UNDERSTAND",
    go: "GO",
    going: "GO",
    come: "COME",
    coming: "COME",
    name: "NAME",
    see: "SEE",
    look: "SEE",
    stop: "STOP",
  };

  function textToGloss(text) {
    const words = text
      .toLowerCase()
      .replace(/[^a-z\s]/g, " ")
      .split(/\s+/)
      .filter(Boolean);

    const tokens = [];
    let i = 0;
    while (i < words.length) {
      const two = words[i] + " " + (words[i + 1] || "");
      if (DICT[two]) {
        tokens.push({ type: "word", key: DICT[two], src: two });
        i += 2;
        continue;
      }

      const w = words[i];
      if (DROP.has(w)) {
        i++;
        continue;
      }

      if (DICT[w]) {
        tokens.push({ type: "word", key: DICT[w], src: w });
      } else if (getUserSigns()[w.toUpperCase()]) {
        tokens.push({ type: "word", key: w.toUpperCase(), src: w });
      } else {
        tokens.push({ type: "fingerspell", word: w.toUpperCase(), src: w });
      }
      i++;
    }

    return tokens;
  }

  function addWordMapping(word, signKey) {
    if (!word || !signKey) return;
    DICT[word.toLowerCase()] = signKey.toUpperCase();
  }

  return {
    textToGloss,
    addWordMapping,
    getDictionary: () => ({ ...DICT }),
  };
}
