'use babel';

/* global atom */

import _ from 'underscore-plus';
import { MODE_LETTER, MODE_WORDS, MODE_WORDS_STARTING } from './constants';

const letterRegExp = (letter = '') =>
  new RegExp(`${letter.replace(/([\W]+)/g, '\\$1')}`, 'gi');

const wordRegExp = () => {
  const nonWordCharacters = atom.config.get('editor.nonWordCharacters');
  return new RegExp(`[^\\s${_.escapeRegExp(nonWordCharacters)}]+`, 'gi');
};

const startingLetterWordRegExp = startingLetter => {
  const nonWordCharacters = atom.config.get('editor.nonWordCharacters');
  return new RegExp(
    `(?:^${startingLetter}|[\\s${_.escapeRegExp(
      nonWordCharacters
    )}]+${startingLetter})`,
    'gi'
  );
};

const getModeBasedPattern = (mode, letter) => {
  switch (mode) {
    case MODE_LETTER:
      return letterRegExp(letter);
    case MODE_WORDS:
      return wordRegExp();
    case MODE_WORDS_STARTING:
      return startingLetterWordRegExp(letter);
    default:
      return letterRegExp(letter);
  }
};

const getLabelChars = (count, chars) => {
  const labelChars = chars.split('');
  if (labelChars.length >= count) {
    return labelChars.slice(0, count);
  }
  return _.flatten(labelChars.map(a => labelChars.map(b => a + b))).slice(
    0,
    count
  );
};

const getVisibleEditors = () =>
  atom.workspace
    .getPanes()
    .map(pane => pane.getActiveEditor())
    .filter(editor => editor);

export default { getModeBasedPattern, getLabelChars, getVisibleEditors };
