'use babel';

/* global atom */
/* eslint-disable no-loop-func, no-bitwise, no-continue */

import { View, TextEditorView } from 'atom-space-pen-views';
import { CompositeDisposable } from 'atom';
import _ from 'underscore-plus';
import Markers from './markers';

class InputView extends View {
  static content() {
    return this.div({ class: 'easy-motion-redux-input' }, () => {
      this.div({
        class: 'editor-container',
        outlet: 'editorContainer'
      });
      return this.subview(
        'editorInput',
        new TextEditorView({
          mini: true,
          placeholderText: 'EasyMotion'
        })
      );
    });
  }

  // constructor(editor, mode, select) {
  //   super(editor, mode, select);
  // }

  initialize(editor, mode, select) {
    this.mode = mode;
    this.select = select;
    this.aPositions = [];
    this.sLetter = null;
    this.editor = editor;

    this.updatePlaceholder();

    this.subscriptions = new CompositeDisposable();

    this.editorView = atom.views.getView(this.editor);
    this.markers = new Markers(this.editor, this.editorView);

    this.editorView.classList.add('easymotion-plus-editor');

    this.handleEvents();
  }

  updatePlaceholder() {
    let sPlaceholderText;

    switch (this.mode) {
      case InputView.MODE_LETTER:
        sPlaceholderText = 'EasyMotion:Letter…';
        break;
      case InputView.MODE_WORDS_STARTING:
        sPlaceholderText = 'EasyMotion:Words starting with letter…';
        break;
      case InputView.MODE_WORDS:
      default:
        sPlaceholderText = 'EasyMotion:Words';
        break;
    }
    this.editorInput.element.getModel().setPlaceholderText(sPlaceholderText);
  }

  handleEvents() {
    this.editorInput.element.addEventListener(
      'keypress',
      this.autosubmit.bind(this)
    );
    this.editorInput.element.addEventListener('blur', this.remove.bind(this));
    this.subscriptions.add(
      atom.commands.add(this.editorInput.element, {
        'core:backspace': this.backspace.bind(this),
        'core:confirm': () => {
          this.confirm();
        },
        'core:cancel': () => {
          this.goBack();
        },
        'core:page-up': () => {
          this.editor.trigger('core:page-up');
        },
        'core:page-down': () => {
          this.editor.trigger('core:page-down');
        }
      })
    );
    this.subscriptions.add(
      this.editor.onDidChangeScrollTop(this.goBack.bind(this))
    );
  }

  resetPositions() {
    this.markers.clear();
    if (
      [InputView.MODE_LETTER, InputView.MODE_WORDS_STARTING].indexOf(
        this.mode
      ) === -1
    ) {
      this.loadPositions();
      this.groupPositions();
    }
  }

  hasPositions() {
    switch (this.mode) {
      case InputView.MODE_LETTER:
      case InputView.MODE_WORDS_STARTING:
        return this.sLetter ? this.aPositions.length > 0 : true;
      case InputView.MODE_WORDS:
      default:
        return this.aPositions.length > 0;
    }
  }

  autosubmit(oEvent) {
    const sChar = String.fromCharCode(oEvent.charCode);

    if (
      !this.sLetter &&
      [InputView.MODE_LETTER, InputView.MODE_WORDS_STARTING].indexOf(
        this.mode
      ) > -1
    ) {
      this.sLetter = sChar;
      this.loadPositions();
      this.groupPositions();
      return false;
    }

    this.filterPositions(sChar);
    return false;
  }

  backspace() {
    if (this.editorInput.getText().length === 0) {
      this.goBack();
      return;
    }

    if (
      [InputView.MODE_LETTER, InputView.MODE_WORDS_STARTING].indexOf(
        this.mode
      ) > -1
    ) {
      if (this.editorInput.getText().length === 1) {
        this.sLetter = null;
        this.loadPositions();
        this.groupPositions();
      } else {
        this.loadPositions();
        this.groupPositions();
        return;
      }
    }

    this.resetPositions();
  }

  remove() {
    this.subscriptions.dispose();
    this.markers.clear();
    this.editorView.classList.remove('easymotion-plus-editor');
    super.remove();
  }

  confirm() {
    const point = this.aPositions[0][0];

    if (this.select) {
      point.column += 1; // include target letter in selection
      this.editor.selectToBufferPosition(point);
    } else {
      this.editor.setCursorBufferPosition(point);
    }
    this.goBack();
  }

  goBack() {
    this.editorView.focus();
    this.remove();
    this.panel.destroy();
  }

  focus() {
    this.editorInput.focus();
  }

  filterPositions(sChar) {
    this.pickPositions(sChar);
    if (this.aPositions.length > 1) {
      this.groupPositions();
    } else {
      this.confirm();
    }
  }

  groupPositions() {
    let iCount = this.aPositions.length,
      sReplaceCharacters = atom.config.get(
        'easy-motion-redux.replaceCharacters'
      ),
      iLast = 0;

    this.oGroupedPositions = {};

    for (const i of _.range(0, sReplaceCharacters.length)) {
      let iTake = Math.floor(iCount / sReplaceCharacters.length);

      if (i < iCount % sReplaceCharacters.length) {
        iTake += 1;
      }

      this.oGroupedPositions[sReplaceCharacters[i]] = [];
      this.aPositions.slice(iLast, iLast + iTake).forEach((oWordStart, j) => {
        let sReplacement,
          bSingle = iTake === 1;

        if (bSingle) {
          sReplacement = sReplaceCharacters[i];
        } else {
          let iCharsAmount = sReplaceCharacters.length,
            iRemains = iTake % iCharsAmount,
            k;

          if (iTake <= iCharsAmount) {
            k = j % iTake;
          } else if (iTake < 2 * iCharsAmount && j >= iRemains * 2) {
            k = j - iRemains;
          } else {
            k = -1;
          }

          sReplacement = sReplaceCharacters[i] + (sReplaceCharacters[k] || '•');
        }

        this.oGroupedPositions[sReplaceCharacters[i]].push(oWordStart);
        this.markers.add(oWordStart, sReplacement, {
          single: bSingle
        });
      });

      iLast += iTake;
    }
  }

  pickPositions(sChar) {
    let sCharacter = sChar;

    this.markers.clear();
    if (
      sCharacter in this.oGroupedPositions &&
      this.oGroupedPositions[sCharacter].length
    ) {
      this.aPositions = this.oGroupedPositions[sCharacter];
      return;
    }

    if (sCharacter !== sCharacter.toLowerCase()) {
      sCharacter = sCharacter.toLowerCase();
    } else if (sCharacter !== sCharacter.toUpperCase()) {
      sCharacter = sCharacter.toUpperCase();
    } else {
      return;
    }

    if (
      sCharacter in this.oGroupedPositions &&
      this.oGroupedPositions[sCharacter].length
    ) {
      this.aPositions = this.oGroupedPositions[sCharacter];
    }
  }

  letterRegExp(sLetter = '') {
    return new RegExp(`${sLetter.replace(/([\W]+)/g, '\\$1')}`, 'gi');
  }

  loadPositions() {
    let oBuffer = this.editor.getBuffer(),
      aPositions = [],
      fMarkBeginning,
      rPositionRegExp;

    fMarkBeginning = oObj => {
      let [iStart, iEnd] = [null, null];

      iStart = oObj.range.start;
      if (this.mode === InputView.MODE_WORDS_STARTING) {
        iStart.column = oObj.range.end.column - 1;
      }
      iEnd = [iStart.row, iStart.column + 1];

      aPositions.push([iStart, iEnd]);
    };

    switch (this.mode) {
      case InputView.MODE_LETTER:
        rPositionRegExp = this.letterRegExp(this.sLetter);
        break;
      case InputView.MODE_WORDS_STARTING:
        rPositionRegExp = this.startingLetterWordRegExp(this.sLetter);
        break;
      case InputView.MODE_WORDS:
      default:
        rPositionRegExp = this.wordRegExp();
        break;
    }

    for (const oRowRange of this.getRowRanges()) {
      oBuffer.scanInRange(rPositionRegExp, oRowRange, fMarkBeginning);
    }

    this.aPositions = aPositions;
  }

  getRowRanges() {
    let iBeginRow = this.editorView.getFirstVisibleScreenRow(),
      iEndRowPadding =
        Math.ceil(
          this.outerHeight() / this.editor.getLineHeightInPixels()
        ) * 2,
      iEndRow =
        this.editorView.getLastVisibleScreenRow() - iEndRowPadding,
      aResultingRows = [];

    for (const iRow of _.range(iBeginRow, iEndRow + 1)) {
      if (this.notFolded(iRow)) {
        aResultingRows.push(iRow);
      }
    }

    aResultingRows = aResultingRows.map(iRow =>
      this.getColumnRangeForRow(iRow)
    );

    return aResultingRows;
  }

  getColumnRangeForRow(iRow) {
    let oBuffer = this.editor.getBuffer(),
      iBeginColumn,
      iEndColumn,
      oRange;

    if (oBuffer.isRowBlank(iRow)) {
      return [[iRow, 0], [iRow, 0]];
    }

    if (this.editor.isSoftWrapped()) {
      oRange = oBuffer.rangeForRow(iRow);
      iBeginColumn = oRange.start.column;
      iEndColumn = oRange.end.column;
    } else {
      oRange = oBuffer.rangeForRow(iRow);
      let iMaxColumn = this.editor.getEditorWidthInChars(),
        iCharWidth = this.editor.getDefaultCharWidth(),
        iLeft = this.editor.getScrollLeft();

      if (iLeft === 0) {
        iBeginColumn = 0;
        iEndColumn = iMaxColumn;
      } else {
        iBeginColumn = Math.floor(iLeft / iCharWidth);
        iEndColumn = iBeginColumn + iMaxColumn;
      }
    }

    return [[iRow, iBeginColumn], [iRow, iEndColumn]];
  }

  notFolded(iRow) {
    return (
      iRow === 0 ||
      !this.editor.isFoldedAtBufferRow(iRow) ||
      !this.editor.isFoldedAtBufferRow(iRow - 1)
    );
  }

  wordRegExp() {
    const sNonWordCharacters = atom.config.get('editor.nonWordCharacters');

    return new RegExp(`[^\\s${_.escapeRegExp(sNonWordCharacters)}]+`, 'gi');
  }

  startingLetterWordRegExp(sStartingLetter) {
    const sNonWordCharacters = atom.config.get('editor.nonWordCharacters');

    return new RegExp(
      `(?:^${sStartingLetter}|[\\s${_.escapeRegExp(
        sNonWordCharacters
      )}]+${sStartingLetter})`,
      'gi'
    );
  }
}

InputView.MODE_WORDS = 'words';
InputView.MODE_LETTER = 'letter';
InputView.MODE_WORDS_STARTING = 'words_starting';

export default InputView;
