export const ALPHABET = [...'AĄBCĆDEĘFGHIJKLŁMNŃOÓPQRSŚTUVWXYZŹŻ']

const LETTER_SET = new Set(ALPHABET)

export const isLetter = (ch) => LETTER_SET.has(ch)

export const cleanPhrase = (raw) =>
  (raw || '').replace(/\s+/g, ' ').trim().toLocaleUpperCase('pl-PL')

export const countLetter = (phrase, letter) =>
  [...phrase].filter((c) => c === letter).length

export const phraseLetters = (phrase) =>
  [...new Set([...phrase].filter(isLetter))]
