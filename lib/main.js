'use babel';

/* global atom */

import { CompositeDisposable } from 'atom';
import EasyMotion from './EasyMotion'

let disposables;

const config = {
  replaceCharacters: {
    type: 'string',
    default: 'asdfghjkl;zxcvbnmqwertyuiop'
  }
};

const activate = () => {
  if (disposables) {
    disposables.dispose();
  }

  disposables = new CompositeDisposable();

  const easyMotion = new EasyMotion()

  disposables.add(
    atom.commands.add('atom-text-editor:not([mini])', {
      'easy-motion-redux:words': () => {
        easyMotion.activate({ mode: 'words' })
      },
      'easy-motion-redux:letter': () => {
        easyMotion.activate({ mode: 'letter' })
      },
      'easy-motion-redux:words_starting': () => {
        easyMotion.activate({ mode: 'words_starting' })
      },
      'easy-motion-redux:words-select': () => {
        easyMotion.activate({ mode: 'words', select: true })
      },
      'easy-motion-redux:letter-select': () => {
        easyMotion.activate({ mode: 'letter', select: true })
      },
      'easy-motion-redux:words_starting-select': () => {
        easyMotion.activate({ mode: 'words_starting', select: true })
      }
    })
  );
};

const deactivate = () => {
  if (disposables) {
    disposables.dispose();
  }
};

export { config, activate, deactivate };
