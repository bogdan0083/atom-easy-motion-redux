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
      'easymotion-plus:words': () => {
        easyMotion.activate({ mode: 'words' })
      },
      'easymotion-plus:letter': () => {
        easyMotion.activate({ mode: 'letter' })
      },
      'easymotion-plus:words_starting': () => {
        easyMotion.activate({ mode: 'words_starting' })
      },
      'easymotion-plus:words-select': () => {
        easyMotion.activate({ mode: 'words', select: true })
      },
      'easymotion-plus:letter-select': () => {
        easyMotion.activate({ mode: 'letter', select: true })
      },
      'easymotion-plus:words_starting-select': () => {
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
