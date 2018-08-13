'use babel';

/* global atom */

import _ from 'underscore';
import { CompositeDisposable } from 'atom';
import { TextEditorView } from 'atom-space-pen-views';
import { getModeBasedPattern, getLabelChars, getVisibleEditors } from './utils';
import { MODE_LETTER, MODE_WORDS, MODE_WORDS_STARTING } from './constants';
import Label from './views/Label';

const placeholderMap = {
  'letter': 'EasyMotion: Letter',
  'words': 'EasyMotion: Words',
  'words-starting': 'EasyMotion: Words starting with letter'
};

class EasyMotion {
  constructor() {
    this.currentMode = 'words';
    this.input = null;
  }

  /**
   * Activate plugin based on config argument.
   * @param Object [config] config of the plugin
   */
  activate(config) {
    // mode defined in config
    this.mode = config.mode;

    // boolean value to define if mode is initialized
    this.modeInitialized = false;

    // select. Should we use selection for command or not
    this.select = config.select;

    this.replaceChars = atom.config.get('easymotion-plus.replaceCharacters');

    // current editor
    // TODO: we will need multiple panes for EasyMotion in the future
    this.activeEditor = atom.workspace.getActiveTextEditor();

    // our markersByEditor
    this.markersByEditor = new Map();

    // labels
    this.labels = [];

    this.labelChars = [];

    this.labelsAndChars = [];

    // letter
    this.letter = null;

    this.inputValue = '';

    // input field
    // TODO: we should not show input if we inside tabs mode
    this.input = new TextEditorView({
      mini: true,
      placeholderText: placeholderMap[this.mode]
    });

    // panel
    this.panel = atom.workspace.addBottomPanel({ item: this.input });

    // subscriptions
    this.subscriptions = new CompositeDisposable();

    // current editor view
    this.activeEditorView = atom.views.getView(this.activeEditor);

    // adding class to a current view
    // TODO: in the future there will be modes with multiple panes
    this.activeEditorView.classList.add('easymotion-plus-editor');

    this.addInputEvents();
    this.addSubscriptions();
    this.input.focus();
    this.runMode(this.mode);
  }

  /**
   * runs mode
   * @param <String> [mode]
   * @return void
   */
  runMode(mode) {
    switch (mode) {
      case MODE_LETTER:
        this.runLetterMode();
        break;
      case MODE_WORDS:
        this.runWordsMode();
        break;
      default:
        this.runWordsMode();
        break;
    }
  }

  runWordsMode() {
    if (!this.modeInitialized) {
      this.loadMarkers();
      this.initializeLabels();
      this.loadLabelChars();
      this.zipCharsAndLabels();
      this.showLabels();
      this.modeInitialized = true;
    } else if (this.inputValue === '') {
      this.showLabels();
    } else {
      this.updateOrLandLabels(this.inputValue.length, this.inputValue);
    }
  }

  runLetterMode() {
    if (!this.modeInitialized && this.inputValue.length === 1) {
      this.loadMarkers();
      this.initializeLabels();
      this.loadLabelChars();
      this.zipCharsAndLabels();
      this.showLabels();
      this.modeInitialized = true;
    } else if (this.modeInitialized && this.inputValue === '') {
      this.clear();
      this.modeInitialized = false;
    } else {
      this.updateOrLandLabels(this.inputValue.length - 1, this.inputValue.slice(1));
    }
  }

  loadMarkers() {
    const pattern = getModeBasedPattern(this.mode, this.inputValue);
    for (const editor of getVisibleEditors()) {
      const visibleEditorRange = this.getVisibleEditorRange(editor);
      const markers = [];
      editor.scanInBufferRange(pattern, visibleEditorRange, ({ range }) =>
        markers.push(editor.markScreenRange(range))
      );
      this.markersByEditor.set(editor, markers);
    }
  }

  initializeLabels() {
    this.labels = [];
    this.markersByEditor.forEach((markers, editor) => {
      markers.forEach(marker => {
        this.labels.push(new Label().initialize({ editor, marker }));
      });
    });
  }

  loadLabelChars() {
    this.labelChars = getLabelChars(this.labels.length, this.replaceChars);
  }

  showLabels() {
    this.labelsAndChars.forEach(([label, chars]) => {
      label.setLabelText(chars);
    });
  }

  zipCharsAndLabels() {
    this.labelsAndChars = _.zip(this.labels, this.labelChars);
  }

  updateOrLandLabels(count, letters) {
    this.labelsAndChars.forEach(([label, chars]) => {
      if (chars.length > 1 && chars.charAt(0) === letters) {
        label.setLabelText(chars.charAt(1));
      } else if (chars === letters) {
        this.landCursor(label);
      } else if (count === 0) {
        label.setLabelText(chars);
      } else {
        label.fadeout();
      }
    });
  }

  landCursor(label) {
    const editor = label.editor;
    const point = label.getPosition();
    const editorView = atom.views.getView(editor);
    this.activeEditor = editor;
    editorView.focus();
    if (
      editor.getSelections().length > 1 &&
      !editor.getLastSelection().isEmpty()
    ) {
      editor.selectToBufferPosition(point);
    } else {
      editor.setCursorBufferPosition(point);
    }
  }

  getVisibleEditorRange(editor) {
    let [startRow, endRow] = editor.element.getVisibleRowRange();
    startRow = editor.bufferRowForScreenRow(startRow)
    endRow = editor.bufferRowForScreenRow(endRow)
    return [[startRow, 0], [endRow - 1, Infinity]];
  }

  /**
   * Add events for input element
   * @return void
   */
  addInputEvents() {
    const inputEditor = this.input.getModel();
    this.input.element.addEventListener('blur', this.deactivate.bind(this));
    this.subscriptions.add(
      inputEditor.onDidChange(this.onInputChange.bind(this))
    );
  }

  addSubscriptions() {
    this.subscriptions.add(
      atom.commands.add(this.input.element, {
        'core:confirm': () => {
          this.deactivate();
        },
        'core:cancel': () => {
          this.deactivate();
        }
      })
    );
  }

  onInputChange() {
    this.inputValue = this.input.getModel().getText();
    this.runMode(this.mode);
  }

  /**
   * Deactivate plugin. Focus to editor view, clean out
   * markersByEditor, labels, classes and subscriptions
   * @return void
   */
  deactivate() {
    this.clear();
    atom.views.getView(this.activeEditor).focus()
    this.subscriptions.dispose();
    this.activeEditorView.classList.remove('easymotion-plus-editor');
    this.panel.destroy();
  }

  clearLabels() {
    this.labels.forEach(l => l.destroy());
    this.labels = [];
  }

  clearAllMarkers() {
    this.markersByEditor.forEach(markers =>
      markers.forEach(m => (m ? m.destroy() : m))
    );
    this.markersByEditor.clear();
  }

  clear() {
    this.clearLabels();
    this.clearAllMarkers();
  }
}

export default EasyMotion;
