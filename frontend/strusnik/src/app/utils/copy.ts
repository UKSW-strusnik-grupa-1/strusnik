const polishLetterMap: Record<string, string> = {
  "\u0105": "a",
  "\u0107": "c",
  "\u0119": "e",
  "\u0142": "l",
  "\u0144": "n",
  "\u00f3": "o",
  "\u015b": "s",
  "\u017a": "z",
  "\u017c": "z",
  "\u0104": "A",
  "\u0106": "C",
  "\u0118": "E",
  "\u0141": "L",
  "\u0143": "N",
  "\u00d3": "O",
  "\u015a": "S",
  "\u0179": "Z",
  "\u017b": "Z",
};

export function stripPolishDiacritics(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u0104\u0105\u0106\u0107\u0118\u0119\u0141\u0142\u0143\u0144\u00d3\u00f3\u015a\u015b\u0179\u017a\u017b\u017c]/g, (letter) => polishLetterMap[letter] ?? letter);
}
