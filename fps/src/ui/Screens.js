// 오버레이 화면 전환기. 한 번에 하나의 .screen만 활성.

export const $ = (sel) => document.querySelector(sel);
export const $$ = (sel) => Array.from(document.querySelectorAll(sel));

export class Screens {
  constructor() {
    this.overlay = $('#overlay');
    this.current = 'scLoad';
    this.stack = [];
    this.overlay.classList.add('on');
  }

  show(id) {
    if (this.current === id) return;
    const prev = document.getElementById(this.current);
    if (prev) prev.classList.remove('active');
    const next = document.getElementById(id);
    if (next) next.classList.add('active');
    this.current = id;
    this.overlay.classList.add('on');
    // 첫 버튼에 포커스 — 키보드 접근성
    next?.querySelector('.mbtn')?.focus?.({ preventScroll: true });
  }

  hide() {
    const prev = document.getElementById(this.current);
    if (prev) prev.classList.remove('active');
    this.current = null;
    this.overlay.classList.remove('on');
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  }

  /** 되돌아올 화면을 기억하며 이동 */
  push(id) {
    this.stack.push(this.current);
    this.show(id);
  }

  pop(fallback = 'scMenu') {
    const prev = this.stack.pop();
    this.show(prev || fallback);
  }

  get visible() { return this.current !== null; }
}
