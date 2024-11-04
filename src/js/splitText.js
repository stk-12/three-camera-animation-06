export class SplitText {
  constructor(el) {
    this.DOM = {};
    this.DOM.el = el instanceof HTMLElement ? el : document.querySelector(el);
    this.chars = this.DOM.el.innerHTML.trim().split("");
    this.DOM.el.innerHTML = this._splitText();
  }

  _splitText() {
    return this.chars.reduce((acc, curr, index) => {
      curr = curr.replace(/\ +/, '&nbsp;');
      return `${acc}<span class="txt txt-${index}">${curr}</span>`;
    }, "");
  }
}