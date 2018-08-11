'use babel';

/* global atom, document, HTMLElement */

class Label extends HTMLElement {
  initialize({ editor, marker }) {
    this.editor = editor;
    this.editorElement = editor.element;
    this.marker = marker;
    this.className = 'easymotion-plus-label';
    this.char1 = document.createElement('span');
    this.char2 = document.createElement('span');
    this.appendChildren([this.char1, this.char2]);

    this.displayed = null;
    return this;
  }

  setLabelText(chars) {
    this.classList.remove('easymotion-plus-label-fadeout')
    const [char1, char2] = [this.char1, this.char2];
    [char1.textContent, char2.textContent] = chars.split('');

    if (!this.displayed) {
      this.editor.decorateMarker(this.marker, {
        type: 'overlay',
        position: 'tail',
        item: this
      });
      this.displayed = true;
    }

  }

  appendChildren(children) {
    for (const child of children) {
      this.appendChild(child);
    }
  }

  getText() {
    return this.textContent();
  }

  getPosition() {
    return this.marker.getStartBufferPosition();
  }

  destroy() {
    this.marker.destroy();
    this.remove();
  }

  fadeout() {
    this.classList.add('easymotion-plus-label-fadeout');
  }
}

export default document.registerElement('easymotion-plus-label', {
  prototype: Label.prototype,
  extends: 'div'
});
