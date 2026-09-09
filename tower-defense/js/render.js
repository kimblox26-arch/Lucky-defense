/* =========================================================================
 *  INFINITE TOWER DEFENSE  —  render.js
 *  절차적 스프라이트(몸통/머리/무기 조합) · 맵 · 투사체 · HUD 오버레이
 * ========================================================================= */
'use strict';

const Draw = {

  /* ================================================== 몸통 */
  body: {
    robe(c, r, col) {
      c.fillStyle = col;
      c.beginPath();
      c.moveTo(0, -r * .25);
      c.lineTo(r * .74, r * .95); c.lineTo(-r * .74, r * .95);
      c.closePath(); c.fill();
      c.fillStyle = 'rgba(255,255,255,.16)';
      c.beginPath(); c.moveTo(0, -r * .25); c.lineTo(r * .2, r * .95); c.lineTo(-r * .2, r * .95); c.closePath(); c.fill();
    },
    cloak(c, r, col) {
      c.fillStyle = col;
      c.beginPath();
      c.moveTo(0, -r * .3); c.quadraticCurveTo(r * .95, r * .1, r * .6, r * .95);
      c.lineTo(-r * .6, r * .95); c.quadraticCurveTo(-r * .95, r * .1, 0, -r * .3);
      c.fill();
      c.fillStyle = 'rgba(0,0,0,.22)';
      c.beginPath(); c.moveTo(0, -r * .1); c.lineTo(r * .35, r * .95); c.lineTo(-r * .35, r * .95); c.closePath(); c.fill();
    },
    armor(c, r, col) {
      c.fillStyle = col;
      c.beginPath();
      c.roundRect(-r * .58, -r * .3, r * 1.16, r * 1.2, r * .22); c.fill();
      c.fillStyle = 'rgba(255,255,255,.28)';
      c.beginPath(); c.roundRect(-r * .5, -r * .22, r * .34, r * .95, r * .14); c.fill();
      c.fillStyle = 'rgba(0,0,0,.25)';
      c.beginPath(); c.roundRect(-r * .12, -r * .1, r * .24, r * .8, r * .1); c.fill();
    },
    construct(c, r, col) {
      c.fillStyle = col;
      c.beginPath(); c.roundRect(-r * .72, -r * .38, r * 1.44, r * 1.3, r * .18); c.fill();
      c.fillStyle = 'rgba(0,0,0,.3)';
      c.fillRect(-r * .72, r * .38, r * 1.44, r * .16);
      c.fillStyle = 'rgba(255,255,255,.25)';
      c.fillRect(-r * .6, -r * .28, r * .3, r * .5);
    },
    spirit(c, r, col, t) {
      const w = r * (.7 + Math.sin(t * 3) * .06);
      c.fillStyle = col; c.globalAlpha = .88;
      c.beginPath();
      c.moveTo(0, -r * .35);
      c.quadraticCurveTo(w, r * .1, w * .5, r * .8);
      c.quadraticCurveTo(0, r * 1.15, -w * .5, r * .8);
      c.quadraticCurveTo(-w, r * .1, 0, -r * .35);
      c.fill(); c.globalAlpha = 1;
    },
    demon(c, r, col) {
      c.fillStyle = col;
      c.beginPath();
      c.moveTo(0, -r * .3); c.lineTo(r * .85, r * .35); c.lineTo(r * .5, r * .95);
      c.lineTo(-r * .5, r * .95); c.lineTo(-r * .85, r * .35); c.closePath(); c.fill();
      c.fillStyle = 'rgba(0,0,0,.28)';
      c.beginPath(); c.moveTo(0, 0); c.lineTo(r * .3, r * .95); c.lineTo(-r * .3, r * .95); c.closePath(); c.fill();
    },
    dragonoid(c, r, col) {
      c.fillStyle = 'rgba(0,0,0,.35)';
      c.beginPath(); c.moveTo(-r * .2, -r * .1); c.lineTo(-r * 1.15, -r * .55); c.lineTo(-r * .95, r * .5); c.closePath(); c.fill();
      c.beginPath(); c.moveTo(r * .2, -r * .1); c.lineTo(r * 1.15, -r * .55); c.lineTo(r * .95, r * .5); c.closePath(); c.fill();
      c.fillStyle = col;
      c.beginPath(); c.roundRect(-r * .55, -r * .32, r * 1.1, r * 1.25, r * .26); c.fill();
      c.fillStyle = 'rgba(255,255,255,.22)';
      c.beginPath(); c.roundRect(-r * .3, -r * .2, r * .6, r * .5, r * .18); c.fill();
    },
    beast(c, r, col) {
      c.fillStyle = col;
      c.beginPath(); c.ellipse(0, r * .35, r * .8, r * .55, 0, 0, U.TAU); c.fill();
      c.beginPath(); c.ellipse(r * .45, -r * .1, r * .4, r * .36, 0, 0, U.TAU); c.fill();
      c.fillStyle = 'rgba(0,0,0,.25)';
      c.beginPath(); c.ellipse(-r * .3, r * .5, r * .35, r * .22, 0, 0, U.TAU); c.fill();
    },
    slime(c, r, col, t) {
      const sq = 1 + Math.sin(t * 6) * .1;
      c.fillStyle = col;
      c.beginPath();
      c.ellipse(0, r * .3, r * .9 / sq, r * .72 * sq, 0, 0, U.TAU); c.fill();
      c.fillStyle = 'rgba(255,255,255,.4)';
      c.beginPath(); c.ellipse(-r * .3, r * .05, r * .2, r * .14, -.4, 0, U.TAU); c.fill();
    },
    humanoid(c, r, col) {
      c.fillStyle = col;
      c.beginPath(); c.roundRect(-r * .45, -r * .15, r * .9, r * 1.05, r * .2); c.fill();
      c.fillStyle = 'rgba(0,0,0,.2)';
      c.fillRect(-r * .45, r * .5, r * .9, r * .12);
    },
    big(c, r, col) {
      c.fillStyle = col;
      c.beginPath(); c.roundRect(-r * .8, -r * .25, r * 1.6, r * 1.25, r * .3); c.fill();
      c.fillStyle = 'rgba(255,255,255,.18)';
      c.beginPath(); c.roundRect(-r * .65, -r * .12, r * .45, r * .9, r * .2); c.fill();
      c.fillStyle = 'rgba(0,0,0,.25)';
      c.beginPath(); c.ellipse(0, r * .55, r * .5, r * .3, 0, 0, U.TAU); c.fill();
    },
    skeleton(c, r, col) {
      c.strokeStyle = col; c.lineWidth = r * .18; c.lineCap = 'round';
      c.beginPath(); c.moveTo(0, -r * .1); c.lineTo(0, r * .7); c.stroke();
      for (let i = 0; i < 3; i++) {
        const y = r * (.05 + i * .22);
        c.beginPath(); c.moveTo(-r * .38, y); c.lineTo(r * .38, y); c.stroke();
      }
      c.beginPath(); c.moveTo(0, r * .7); c.lineTo(-r * .3, r * .95); c.moveTo(0, r * .7); c.lineTo(r * .3, r * .95); c.stroke();
    },
    ghost(c, r, col, t) {
      c.globalAlpha = .78;
      c.fillStyle = col;
      c.beginPath();
      c.moveTo(-r * .75, r * .6);
      c.quadraticCurveTo(-r * .8, -r * .5, 0, -r * .45);
      c.quadraticCurveTo(r * .8, -r * .5, r * .75, r * .6);
      for (let i = 0; i < 4; i++) {
        const x = r * .75 - (i + .5) * (r * 1.5 / 4);
        c.quadraticCurveTo(x, r * (.6 + (i % 2 ? .3 : -.05) + Math.sin(t * 4 + i) * .08), x - r * .19, r * .6);
      }
      c.fill(); c.globalAlpha = 1;
    },
    wing(c, r, col, t) {
      const f = Math.sin(t * 12) * .35;
      c.fillStyle = 'rgba(255,255,255,.25)';
      c.save(); c.rotate(-.5 + f);
      c.beginPath(); c.ellipse(-r * .8, -r * .1, r * .7, r * .28, 0, 0, U.TAU); c.fill(); c.restore();
      c.save(); c.rotate(.5 - f);
      c.beginPath(); c.ellipse(r * .8, -r * .1, r * .7, r * .28, 0, 0, U.TAU); c.fill(); c.restore();
      c.fillStyle = col;
      c.beginPath(); c.ellipse(0, r * .2, r * .45, r * .6, 0, 0, U.TAU); c.fill();
    },
    insect(c, r, col) {
      c.fillStyle = col;
      c.beginPath(); c.ellipse(0, r * .35, r * .6, r * .45, 0, 0, U.TAU); c.fill();
      c.beginPath(); c.ellipse(0, -r * .2, r * .4, r * .34, 0, 0, U.TAU); c.fill();
      c.strokeStyle = col; c.lineWidth = r * .1; c.lineCap = 'round';
      for (let i = -1; i <= 1; i += 2) for (let j = 0; j < 3; j++) {
        c.beginPath(); c.moveTo(i * r * .35, r * (.1 + j * .22));
        c.lineTo(i * r * .95, r * (-.05 + j * .3)); c.stroke();
      }
    },
    crystal(c, r, col, t) {
      c.fillStyle = col;
      c.save(); c.rotate(t * .6);
      c.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * U.TAU, rad = i % 2 ? r * .55 : r * .95;
        i ? c.lineTo(Math.cos(a) * rad, Math.sin(a) * rad + r * .25) : c.moveTo(Math.cos(a) * rad, Math.sin(a) * rad + r * .25);
      }
      c.closePath(); c.fill();
      c.fillStyle = 'rgba(255,255,255,.35)';
      c.beginPath(); c.moveTo(0, -r * .6); c.lineTo(r * .3, r * .25); c.lineTo(-r * .1, r * .25); c.closePath(); c.fill();
      c.restore();
    },
    dragon(c, r, col, t) {
      const f = Math.sin(t * 6) * .25;
      c.fillStyle = 'rgba(0,0,0,.4)';
      c.save(); c.rotate(-.3 + f);
      c.beginPath(); c.moveTo(-r * .3, 0); c.lineTo(-r * 1.5, -r * .7); c.lineTo(-r * 1.2, r * .55); c.closePath(); c.fill(); c.restore();
      c.save(); c.rotate(.3 - f);
      c.beginPath(); c.moveTo(r * .3, 0); c.lineTo(r * 1.5, -r * .7); c.lineTo(r * 1.2, r * .55); c.closePath(); c.fill(); c.restore();
      c.fillStyle = col;
      c.beginPath(); c.ellipse(0, r * .3, r * .6, r * .75, 0, 0, U.TAU); c.fill();
      c.beginPath(); c.ellipse(0, -r * .35, r * .42, r * .34, 0, 0, U.TAU); c.fill();
      c.fillStyle = 'rgba(255,255,255,.2)';
      c.beginPath(); c.ellipse(0, r * .35, r * .28, r * .5, 0, 0, U.TAU); c.fill();
    },
  },

  /* ================================================== 머리/장식 */
  head: {
    none() { },
    hood(c, r, col) {
      c.fillStyle = U.shade(col, -.16);
      c.beginPath(); c.arc(0, -r * .55, r * .42, Math.PI, 0); c.lineTo(r * .42, -r * .3); c.lineTo(-r * .42, -r * .3); c.fill();
      c.fillStyle = 'rgba(0,0,0,.6)';
      c.beginPath(); c.ellipse(0, -r * .5, r * .24, r * .2, 0, 0, U.TAU); c.fill();
    },
    helm(c, r, col) {
      c.fillStyle = U.shade(col, .12);
      c.beginPath(); c.arc(0, -r * .55, r * .4, Math.PI, 0); c.lineTo(r * .4, -r * .25); c.lineTo(-r * .4, -r * .25); c.fill();
      c.fillStyle = 'rgba(0,0,0,.65)'; c.fillRect(-r * .3, -r * .58, r * .6, r * .13);
    },
    crown(c, r, col) {
      c.fillStyle = '#ffd24d';
      c.beginPath();
      c.moveTo(-r * .42, -r * .5); c.lineTo(-r * .42, -r * .8); c.lineTo(-r * .2, -r * .62);
      c.lineTo(0, -r * .92); c.lineTo(r * .2, -r * .62); c.lineTo(r * .42, -r * .8); c.lineTo(r * .42, -r * .5);
      c.closePath(); c.fill();
      c.fillStyle = U.shade(col, .1);
      c.beginPath(); c.arc(0, -r * .4, r * .3, 0, U.TAU); c.fill();
    },
    horn(c, r, col) {
      c.fillStyle = U.shade(col, .1);
      c.beginPath(); c.arc(0, -r * .45, r * .33, 0, U.TAU); c.fill();
      c.fillStyle = '#f6f1e0';
      c.beginPath(); c.moveTo(-r * .3, -r * .6); c.quadraticCurveTo(-r * .7, -r * 1.0, -r * .3, -r * 1.05); c.quadraticCurveTo(-r * .28, -r * .8, -r * .16, -r * .66); c.fill();
      c.beginPath(); c.moveTo(r * .3, -r * .6); c.quadraticCurveTo(r * .7, -r * 1.0, r * .3, -r * 1.05); c.quadraticCurveTo(r * .28, -r * .8, r * .16, -r * .66); c.fill();
    },
    halo(c, r, col, t) {
      c.fillStyle = U.shade(col, .1);
      c.beginPath(); c.arc(0, -r * .45, r * .3, 0, U.TAU); c.fill();
      c.strokeStyle = '#ffe9a0'; c.lineWidth = r * .1;
      c.shadowColor = '#ffe9a0'; c.shadowBlur = 10;
      c.beginPath(); c.ellipse(0, -r * .95, r * .38, r * .13, 0, 0, U.TAU); c.stroke();
      c.shadowBlur = 0;
    },
    mask(c, r, col) {
      c.fillStyle = U.shade(col, -.1);
      c.beginPath(); c.arc(0, -r * .45, r * .32, 0, U.TAU); c.fill();
      c.fillStyle = '#ff4d6d';
      c.fillRect(-r * .32, -r * .52, r * .64, r * .14);
    },
    hat(c, r, col) {
      c.fillStyle = U.shade(col, .06);
      c.beginPath(); c.arc(0, -r * .42, r * .3, 0, U.TAU); c.fill();
      c.fillStyle = U.shade(col, -.25);
      c.beginPath(); c.ellipse(0, -r * .68, r * .6, r * .12, 0, 0, U.TAU); c.fill();
      c.beginPath(); c.moveTo(-r * .3, -r * .68); c.quadraticCurveTo(r * .1, -r * 1.5, r * .34, -r * .7); c.fill();
    },
    goggle(c, r, col) {
      c.fillStyle = U.shade(col, .05);
      c.beginPath(); c.arc(0, -r * .45, r * .31, 0, U.TAU); c.fill();
      c.fillStyle = '#2a2f3a'; c.fillRect(-r * .34, -r * .56, r * .68, r * .18);
      c.fillStyle = '#7ff0ff'; c.fillRect(r * .04, -r * .53, r * .18, r * .12);
    },
    orb(c, r, col, t) {
      c.fillStyle = U.shade(col, .06);
      c.beginPath(); c.arc(0, -r * .42, r * .28, 0, U.TAU); c.fill();
      const p = .5 + Math.sin(t * 4) * .5;
      c.fillStyle = `rgba(255,255,255,${.4 + p * .5})`;
      c.shadowColor = '#fff'; c.shadowBlur = 12;
      c.beginPath(); c.arc(0, -r * .95, r * .16 + p * r * .04, 0, U.TAU); c.fill();
      c.shadowBlur = 0;
    },
    leaf(c, r, col) {
      c.fillStyle = U.shade(col, .05);
      c.beginPath(); c.arc(0, -r * .42, r * .3, 0, U.TAU); c.fill();
      c.fillStyle = '#5fd97a';
      c.beginPath(); c.ellipse(-r * .3, -r * .78, r * .26, r * .12, -.7, 0, U.TAU); c.fill();
      c.beginPath(); c.ellipse(r * .3, -r * .78, r * .26, r * .12, .7, 0, U.TAU); c.fill();
    },
    skull(c, r, col) {
      c.fillStyle = '#f2eddc';
      c.beginPath(); c.arc(0, -r * .5, r * .33, 0, U.TAU); c.fill();
      c.fillStyle = '#1a1a1a';
      c.beginPath(); c.arc(-r * .12, -r * .53, r * .09, 0, U.TAU); c.fill();
      c.beginPath(); c.arc(r * .12, -r * .53, r * .09, 0, U.TAU); c.fill();
      c.fillRect(-r * .06, -r * .38, r * .12, r * .1);
    },
    ear(c, r, col) {
      c.fillStyle = U.shade(col, .08);
      c.beginPath(); c.arc(0, -r * .42, r * .3, 0, U.TAU); c.fill();
      c.beginPath(); c.moveTo(-r * .24, -r * .58); c.lineTo(-r * .6, -r * .85); c.lineTo(-r * .2, -r * .3); c.fill();
      c.beginPath(); c.moveTo(r * .24, -r * .58); c.lineTo(r * .6, -r * .85); c.lineTo(r * .2, -r * .3); c.fill();
      c.fillStyle = '#ff5a5a';
      c.beginPath(); c.arc(-r * .1, -r * .45, r * .05, 0, U.TAU); c.arc(r * .1, -r * .45, r * .05, 0, U.TAU); c.fill();
    },
    tusk(c, r, col) {
      c.fillStyle = U.shade(col, .08);
      c.beginPath(); c.arc(0, -r * .42, r * .32, 0, U.TAU); c.fill();
      c.fillStyle = '#fffbe8';
      c.beginPath(); c.moveTo(-r * .2, -r * .3); c.lineTo(-r * .28, -r * .05); c.lineTo(-r * .1, -r * .28); c.fill();
      c.beginPath(); c.moveTo(r * .2, -r * .3); c.lineTo(r * .28, -r * .05); c.lineTo(r * .1, -r * .28); c.fill();
      c.fillStyle = '#3a0f0f';
      c.beginPath(); c.arc(-r * .11, -r * .46, r * .05, 0, U.TAU); c.arc(r * .11, -r * .46, r * .05, 0, U.TAU); c.fill();
    },
    eye(c, r, col, t) {
      c.fillStyle = '#fff';
      c.beginPath(); c.arc(0, -r * .42, r * .27, 0, U.TAU); c.fill();
      c.fillStyle = '#c0304f';
      c.beginPath(); c.arc(Math.cos(t) * r * .06, -r * .42 + Math.sin(t * 1.3) * r * .05, r * .13, 0, U.TAU); c.fill();
    },
    triple(c, r, col) {
      for (let i = -1; i <= 1; i++) {
        c.fillStyle = U.shade(col, .05 + i * .04);
        c.beginPath(); c.arc(i * r * .38, -r * (.42 + (i === 0 ? .18 : 0)), r * .22, 0, U.TAU); c.fill();
        c.fillStyle = '#ffe14d';
        c.beginPath(); c.arc(i * r * .38, -r * (.44 + (i === 0 ? .18 : 0)), r * .06, 0, U.TAU); c.fill();
      }
    },
    beak(c, r, col) {
      c.fillStyle = U.shade(col, -.05);
      c.beginPath(); c.arc(0, -r * .45, r * .32, 0, U.TAU); c.fill();
      c.fillStyle = '#d8cba0';
      c.beginPath(); c.moveTo(0, -r * .5); c.lineTo(r * .1, -r * .05); c.lineTo(-r * .1, -r * .05); c.fill();
      c.fillStyle = '#e04040';
      c.beginPath(); c.arc(-r * .14, -r * .55, r * .06, 0, U.TAU); c.arc(r * .14, -r * .55, r * .06, 0, U.TAU); c.fill();
    },
  },

  /* ================================================== 무기 */
  weapon: {
    none() { },
    bow(c, r, col) {
      c.strokeStyle = '#c8a05a'; c.lineWidth = r * .12; c.lineCap = 'round';
      c.beginPath(); c.arc(r * .52, r * .1, r * .48, -1.15, 1.15); c.stroke();
      c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = r * .05;
      c.beginPath(); c.moveTo(r * .72, r * .1 - r * .44); c.lineTo(r * .72, r * .1 + r * .44); c.stroke();
    },
    crossbow(c, r, col) {
      c.fillStyle = '#8a6a3a';
      c.fillRect(r * .25, r * .02, r * .7, r * .13);
      c.strokeStyle = '#c8a05a'; c.lineWidth = r * .1;
      c.beginPath(); c.moveTo(r * .55, -r * .3); c.lineTo(r * .55, r * .48); c.stroke();
    },
    staff(c, r, col) {
      c.strokeStyle = '#8a6a3a'; c.lineWidth = r * .12; c.lineCap = 'round';
      c.beginPath(); c.moveTo(r * .45, r * .8); c.lineTo(r * .6, -r * .7); c.stroke();
      c.fillStyle = col; c.shadowColor = col; c.shadowBlur = 14;
      c.beginPath(); c.arc(r * .62, -r * .78, r * .2, 0, U.TAU); c.fill(); c.shadowBlur = 0;
    },
    wand(c, r, col) {
      c.strokeStyle = '#6a5a3a'; c.lineWidth = r * .1; c.lineCap = 'round';
      c.beginPath(); c.moveTo(r * .35, r * .45); c.lineTo(r * .75, -r * .25); c.stroke();
      c.fillStyle = col; c.shadowColor = col; c.shadowBlur = 12;
      c.beginPath(); c.arc(r * .78, -r * .3, r * .14, 0, U.TAU); c.fill(); c.shadowBlur = 0;
    },
    sword(c, r, col) {
      c.fillStyle = '#e8eef6';
      c.beginPath(); c.moveTo(r * .55, r * .4); c.lineTo(r * .72, -r * .85); c.lineTo(r * .86, r * .4); c.closePath(); c.fill();
      c.fillStyle = '#c8a05a'; c.fillRect(r * .48, r * .35, r * .48, r * .12);
    },
    spear(c, r, col) {
      c.strokeStyle = '#8a6a3a'; c.lineWidth = r * .1;
      c.beginPath(); c.moveTo(r * .4, r * .8); c.lineTo(r * .78, -r * .7); c.stroke();
      c.fillStyle = '#e8eef6';
      c.beginPath(); c.moveTo(r * .78, -r * 1.05); c.lineTo(r * .92, -r * .6); c.lineTo(r * .64, -r * .6); c.closePath(); c.fill();
    },
    dagger(c, r, col) {
      c.fillStyle = '#dfe6ef';
      c.beginPath(); c.moveTo(r * .55, r * .3); c.lineTo(r * .68, -r * .35); c.lineTo(r * .78, r * .3); c.closePath(); c.fill();
      c.fillStyle = '#5a4a3a'; c.fillRect(r * .58, r * .28, r * .18, r * .22);
    },
    axe(c, r, col) {
      c.strokeStyle = '#8a6a3a'; c.lineWidth = r * .11;
      c.beginPath(); c.moveTo(r * .5, r * .7); c.lineTo(r * .68, -r * .55); c.stroke();
      c.fillStyle = '#cfd8e4';
      c.beginPath(); c.arc(r * .68, -r * .45, r * .34, -1.4, 1.4); c.fill();
    },
    hammer(c, r, col) {
      c.strokeStyle = '#8a6a3a'; c.lineWidth = r * .12;
      c.beginPath(); c.moveTo(r * .5, r * .7); c.lineTo(r * .66, -r * .45); c.stroke();
      c.fillStyle = col; c.shadowColor = col; c.shadowBlur = 10;
      c.beginPath(); c.roundRect(r * .38, -r * .85, r * .58, r * .42, r * .1); c.fill(); c.shadowBlur = 0;
    },
    scythe(c, r, col) {
      c.strokeStyle = '#4a3a5a'; c.lineWidth = r * .11;
      c.beginPath(); c.moveTo(r * .42, r * .8); c.lineTo(r * .7, -r * .7); c.stroke();
      c.strokeStyle = col; c.lineWidth = r * .16; c.lineCap = 'round';
      c.shadowColor = col; c.shadowBlur = 12;
      c.beginPath(); c.arc(r * .35, -r * .68, r * .45, -.3, 1.5); c.stroke(); c.shadowBlur = 0;
    },
    cannon(c, r, col) {
      c.fillStyle = '#4a5260';
      c.beginPath(); c.roundRect(r * .2, -r * .24, r * .95, r * .48, r * .12); c.fill();
      c.fillStyle = '#2f3540';
      c.beginPath(); c.arc(r * 1.1, 0, r * .2, 0, U.TAU); c.fill();
      c.fillStyle = col; c.globalAlpha = .8;
      c.fillRect(r * .3, -r * .1, r * .5, r * .08); c.globalAlpha = 1;
    },
    rifle(c, r, col) {
      c.fillStyle = '#39414f';
      c.fillRect(r * .1, -r * .09, r * 1.15, r * .18);
      c.fillStyle = '#252b36'; c.fillRect(r * .05, -r * .02, r * .3, r * .3);
      c.fillStyle = col; c.shadowColor = col; c.shadowBlur = 8;
      c.fillRect(r * .55, -r * .2, r * .22, r * .1); c.shadowBlur = 0;
    },
    bomb(c, r, col) {
      c.fillStyle = '#2f3440';
      c.beginPath(); c.arc(r * .6, r * .05, r * .3, 0, U.TAU); c.fill();
      c.strokeStyle = '#ff9d3f'; c.lineWidth = r * .07;
      c.beginPath(); c.moveTo(r * .72, -r * .2); c.quadraticCurveTo(r * .95, -r * .45, r * .82, -r * .55); c.stroke();
    },
    flask(c, r, col) {
      c.fillStyle = 'rgba(255,255,255,.35)';
      c.beginPath(); c.moveTo(r * .5, -r * .3); c.lineTo(r * .78, -r * .3); c.lineTo(r * .86, r * .3);
      c.quadraticCurveTo(r * .64, r * .5, r * .42, r * .3); c.closePath(); c.fill();
      c.fillStyle = col;
      c.beginPath(); c.moveTo(r * .46, r * .05); c.lineTo(r * .82, r * .05); c.lineTo(r * .86, r * .3);
      c.quadraticCurveTo(r * .64, r * .5, r * .42, r * .3); c.closePath(); c.fill();
    },
    orb(c, r, col, t) {
      const p = .5 + Math.sin(t * 3.5) * .5;
      c.fillStyle = col; c.shadowColor = col; c.shadowBlur = 16;
      c.beginPath(); c.arc(r * .68, -r * .05, r * .24 + p * r * .05, 0, U.TAU); c.fill();
      c.shadowBlur = 0;
      c.fillStyle = 'rgba(255,255,255,.6)';
      c.beginPath(); c.arc(r * .62, -r * .12, r * .07, 0, U.TAU); c.fill();
    },
    torch(c, r, col, t) {
      c.strokeStyle = '#7a5a2a'; c.lineWidth = r * .11;
      c.beginPath(); c.moveTo(r * .5, r * .5); c.lineTo(r * .62, -r * .2); c.stroke();
      const f = .8 + Math.sin(t * 12) * .2;
      c.fillStyle = '#ff8a2a'; c.shadowColor = '#ff6b35'; c.shadowBlur = 16;
      c.beginPath(); c.ellipse(r * .64, -r * .42, r * .17 * f, r * .3 * f, 0, 0, U.TAU); c.fill();
      c.fillStyle = '#ffe07a';
      c.beginPath(); c.ellipse(r * .64, -r * .38, r * .08 * f, r * .16 * f, 0, 0, U.TAU); c.fill();
      c.shadowBlur = 0;
    },
    sling(c, r, col) {
      c.strokeStyle = '#a08a5a'; c.lineWidth = r * .06;
      c.beginPath(); c.moveTo(r * .3, -r * .1); c.lineTo(r * .8, r * .25); c.moveTo(r * .3, -r * .1); c.lineTo(r * .8, -r * .35); c.stroke();
      c.fillStyle = '#8a8a8a';
      c.beginPath(); c.arc(r * .84, -r * .05, r * .13, 0, U.TAU); c.fill();
    },
    dart(c, r, col) {
      c.fillStyle = '#6a5a3a';
      c.beginPath(); c.roundRect(r * .35, -r * .06, r * .6, r * .12, r * .06); c.fill();
      c.fillStyle = col;
      c.beginPath(); c.moveTo(r * 1.0, 0); c.lineTo(r * .86, -r * .12); c.lineTo(r * .86, r * .12); c.fill();
    },
    claw(c, r, col) {
      c.strokeStyle = '#f0ead8'; c.lineWidth = r * .09; c.lineCap = 'round';
      for (let i = -1; i <= 1; i++) {
        c.beginPath();
        c.moveTo(r * .45, i * r * .22);
        c.quadraticCurveTo(r * .85, i * r * .3, r * .95, i * r * .12);
        c.stroke();
      }
    },
  },

  /* ================================================== 통합 스프라이트 */
  sprite(c, x, y, r, art, col, o = {}) {
    const t = o.t || 0;
    c.save();
    c.translate(x, y + (o.bob || 0));
    if (o.rot) c.rotate(o.rot);
    if (o.scale) c.scale(o.scale, o.scale);
    if (o.flip) c.scale(-1, 1);
    /* 그림자 */
    if (o.shadow !== false) {
      c.fillStyle = 'rgba(0,0,0,.28)';
      c.beginPath(); c.ellipse(0, r * 1.02, r * .62, r * .2, 0, 0, U.TAU); c.fill();
    }
    if (o.tint) { c.globalAlpha = o.alpha !== undefined ? o.alpha : 1; }
    (this.body[art.b] || this.body.humanoid)(c, r, col, t);
    (this.head[art.h] || this.head.none)(c, r, col, t);
    if (art.w) (this.weapon[art.w] || this.weapon.none)(c, r, o.wcol || col, t);
    c.restore();
  },

  /* ================================================== 맵 */
  drawMap(c, g) {
    const m = g.map, ts = g.ts, ox = g.ox, oy = g.oy;
    /* 배경 그라디언트 */
    const grd = c.createLinearGradient(0, oy, 0, oy + g.gh * ts);
    grd.addColorStop(0, m.bg); grd.addColorStop(1, m.bg2);
    c.fillStyle = grd;
    c.fillRect(ox, oy, g.gw * ts, g.gh * ts);

    /* 타일 격자 */
    for (let gy = 0; gy < g.gh; gy++) {
      for (let gx = 0; gx < g.gw; gx++) {
        const px = ox + gx * ts, py = oy + gy * ts;
        if (g.isPath(gx, gy)) continue;
        c.fillStyle = (gx + gy) % 2 ? 'rgba(255,255,255,.035)' : 'rgba(0,0,0,.06)';
        c.fillRect(px, py, ts, ts);
      }
    }

    /* 경로 */
    c.lineCap = 'round'; c.lineJoin = 'round';
    c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = ts * .96;
    c.beginPath();
    g.pathCoords.forEach((p, i) => {
      const x = ox + (p[0] + .5) * ts, y = oy + (p[1] + .5) * ts;
      i ? c.lineTo(x, y) : c.moveTo(x, y);
    });
    c.stroke();
    c.strokeStyle = m.road; c.lineWidth = ts * .82;
    c.stroke();
    /* 경로 하이라이트 점선 */
    c.setLineDash([ts * .22, ts * .3]);
    c.strokeStyle = 'rgba(255,255,255,.13)'; c.lineWidth = ts * .1;
    c.lineDashOffset = -g.time * 26;
    c.stroke();
    c.setLineDash([]);

    /* 시작/도착 표식 */
    const s = g.pathCoords[0], e = g.pathCoords[g.pathCoords.length - 1];
    const sx = ox + (s[0] + .5) * ts, sy = oy + (s[1] + .5) * ts;
    const ex = ox + (e[0] + .5) * ts, ey = oy + (e[1] + .5) * ts;
    c.fillStyle = 'rgba(255,80,80,.22)';
    c.beginPath(); c.arc(sx, sy, ts * .55, 0, U.TAU); c.fill();
    const pulse = .5 + Math.sin(g.time * 3) * .5;
    c.strokeStyle = `rgba(120,255,140,${.35 + pulse * .4})`; c.lineWidth = ts * .12;
    c.beginPath(); c.arc(ex, ey, ts * (.45 + pulse * .12), 0, U.TAU); c.stroke();
    c.fillStyle = 'rgba(120,255,140,.18)';
    c.beginPath(); c.arc(ex, ey, ts * .45, 0, U.TAU); c.fill();
  },

  /* ================================================== 배치 그리드 오버레이 */
  drawPlacement(c, g) {
    if (!g.placing && !g.dragUnit) return;
    const ts = g.ts, ox = g.ox, oy = g.oy;
    for (let gy = 0; gy < g.gh; gy++) for (let gx = 0; gx < g.gw; gx++) {
      if (g.isPath(gx, gy)) continue;
      const occupied = g.unitAt(gx, gy);
      c.fillStyle = occupied ? 'rgba(255,90,90,.13)' : 'rgba(120,255,160,.14)';
      c.fillRect(ox + gx * ts + 2, oy + gy * ts + 2, ts - 4, ts - 4);
    }
  },

  /* ================================================== 유닛 */
  drawUnit(c, u, g) {
    const ts = g.ts;
    const r = ts * .40;
    const def = u.def, rar = RARITY[RARITY_IDX[def.rarity]];
    const col = ELEM[def.elem].color;
    const x = u.px, y = u.py;
    const t = g.time + u.seed;

    /* 등급 받침 */
    c.save();
    const glowPulse = .6 + Math.sin(t * 2.4) * .4;
    c.shadowColor = rar.glow; c.shadowBlur = 6 + RARITY_IDX[def.rarity] * 3.2 * glowPulse;
    c.fillStyle = U.rgba(rar.color, .22);
    c.beginPath(); c.ellipse(x, y + r * .95, r * .82, r * .3, 0, 0, U.TAU); c.fill();
    c.strokeStyle = U.rgba(rar.color, .75); c.lineWidth = 2;
    c.beginPath(); c.ellipse(x, y + r * .95, r * .82, r * .3, 0, 0, U.TAU); c.stroke();
    c.shadowBlur = 0;
    c.restore();

    /* 공격 반동 */
    const rec = u.recoil > 0 ? U.easeOut(u.recoil / .12) : 0;
    const aim = u.aimAngle;
    const flip = Math.cos(aim) < 0;
    const bob = Math.sin(t * 2.2) * r * .06 - rec * r * .12;

    c.save();
    c.translate(x, y);
    if (u.buffFlash > 0) { c.shadowColor = '#fff'; c.shadowBlur = 16 * u.buffFlash; }
    Draw.sprite(c, 0, 0, r * (1 + rec * .1), def.art, col, {
      t, bob, flip, wcol: col, shadow: true
    });
    c.shadowBlur = 0;
    c.restore();

    /* 성급 표시 */
    const st = u.star;
    const sy2 = y - r * 1.35;
    for (let i = 0; i < st; i++) {
      const sx2 = x + (i - (st - 1) / 2) * (r * .34);
      c.fillStyle = st >= 3 ? '#ffd24d' : '#ffffff';
      c.shadowColor = st >= 3 ? '#ffb300' : '#000'; c.shadowBlur = 5;
      c.beginPath();
      for (let k = 0; k < 10; k++) {
        const rr = k % 2 ? r * .06 : r * .14;
        const a = (k / 10) * U.TAU - Math.PI / 2;
        k ? c.lineTo(sx2 + Math.cos(a) * rr, sy2 + Math.sin(a) * rr) : c.moveTo(sx2 + Math.cos(a) * rr, sy2 + Math.sin(a) * rr);
      }
      c.closePath(); c.fill(); c.shadowBlur = 0;
    }

    /* 선택 링 & 사거리 */
    if (g.selected === u) {
      c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = 2.5;
      c.setLineDash([6, 5]); c.lineDashOffset = -g.time * 30;
      c.beginPath(); c.arc(x, y, r * 1.15, 0, U.TAU); c.stroke();
      c.setLineDash([]);
      const rng = u.stat.rng * ts;
      c.fillStyle = U.rgba(col, .07);
      c.beginPath(); c.arc(x, y, rng, 0, U.TAU); c.fill();
      c.strokeStyle = U.rgba(col, .5); c.lineWidth = 2;
      c.beginPath(); c.arc(x, y, rng, 0, U.TAU); c.stroke();
    }
    /* 합성 가능 표시 */
    if (u.mergeReady && g.time % 1 < .6) {
      c.fillStyle = '#ffd24d'; c.shadowColor = '#ffb300'; c.shadowBlur = 8;
      c.font = `900 ${Math.round(r * .62)}px system-ui`;
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText('⇪', x + r * .85, y - r * .85);
      c.shadowBlur = 0;
    }
  },

  /* ================================================== 소환수 */
  drawMinion(c, m, g) {
    const r = g.ts * .2;
    const col = ELEM[m.owner.def.elem].color;
    c.save();
    c.globalAlpha = .92;
    c.shadowColor = col; c.shadowBlur = 8;
    c.fillStyle = col;
    c.beginPath();
    const t = g.time * 4 + m.seed;
    for (let i = 0; i < 3; i++) {
      const a = t + i / 3 * U.TAU;
      c.moveTo(m.x + Math.cos(a) * r, m.y + Math.sin(a) * r);
      c.arc(m.x, m.y, r * .55, a, a + 1.4);
    }
    c.fill();
    c.fillStyle = '#fff';
    c.beginPath(); c.arc(m.x, m.y, r * .28, 0, U.TAU); c.fill();
    c.shadowBlur = 0; c.restore();
  },

  /* ================================================== 적 */
  drawEnemy(c, e, g) {
    const ts = g.ts;
    const r = ts * .36 * (e.def.scale || 1);
    const x = e.x, y = e.y;
    const t = g.time + e.seed;
    let col = e.def.color;

    c.save();
    /* 상태 색 변조 */
    if (e.frozen > 0) col = U.mixHex(col, '#8fe0ff', .65);
    else if (e.chill > 0) col = U.mixHex(col, '#7fc8ff', .3);
    if (e.poisonStacks > 0) col = U.mixHex(col, '#7bdd52', Math.min(.45, e.poisonStacks * .06));
    if (e.burn > 0) col = U.mixHex(col, '#ff6b35', .25);
    if (e.hitFlash > 0) col = U.mixHex(col, '#ffffff', U.clamp(e.hitFlash * 5, 0, .8));

    if (e.def.flags && e.def.flags.includes('ghost')) c.globalAlpha = .72;

    /* 비행 유닛은 살짝 떠 있음 */
    const fly = e.flying ? -ts * .22 + Math.sin(t * 3) * ts * .05 : 0;
    const walkBob = e.flying ? 0 : Math.abs(Math.sin(t * (6 * e.def.spd))) * r * .1;

    /* 보스 오라 */
    if (e.boss) {
      const p = .5 + Math.sin(g.time * 3) * .5;
      c.shadowColor = e.def.color; c.shadowBlur = 22 + p * 14;
      c.strokeStyle = U.rgba(e.def.color, .35 + p * .25); c.lineWidth = 3;
      c.beginPath(); c.arc(x, y + fly, r * (1.25 + p * .12), 0, U.TAU); c.stroke();
      c.shadowBlur = 0;
    }
    /* 격노 */
    if (e.raging) {
      c.shadowColor = '#ff3a3a'; c.shadowBlur = 16;
    }

    Draw.sprite(c, x, y + fly, r, e.def.art, col, { t, bob: -walkBob, flip: e.dirX < 0, shadow: !e.flying });
    c.shadowBlur = 0;

    /* 비행 그림자 */
    if (e.flying) {
      c.fillStyle = 'rgba(0,0,0,.25)';
      c.beginPath(); c.ellipse(x, y + r * .6, r * .5, r * .16, 0, 0, U.TAU); c.fill();
    }

    /* 보호막 */
    if (e.shield > 0) {
      const p = .5 + Math.sin(g.time * 5 + e.seed) * .5;
      c.strokeStyle = `rgba(120,200,255,${.5 + p * .3})`; c.lineWidth = 2.4;
      c.shadowColor = '#7fd8ff'; c.shadowBlur = 10;
      c.beginPath(); c.arc(x, y + fly, r * 1.18, 0, U.TAU); c.stroke();
      c.shadowBlur = 0;
      c.fillStyle = 'rgba(120,200,255,.13)';
      c.beginPath(); c.arc(x, y + fly, r * 1.18, 0, U.TAU); c.fill();
    }
    /* 빙결 */
    if (e.frozen > 0) {
      c.fillStyle = 'rgba(150,225,255,.35)';
      c.strokeStyle = 'rgba(220,245,255,.85)'; c.lineWidth = 2;
      c.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * U.TAU - .3;
        const rr = r * (1.25 + (i % 2 ? .16 : 0));
        i ? c.lineTo(x + Math.cos(a) * rr, y + fly + Math.sin(a) * rr) : c.moveTo(x + Math.cos(a) * rr, y + fly + Math.sin(a) * rr);
      }
      c.closePath(); c.fill(); c.stroke();
    }
    /* 저주 */
    if (e.curse > 0) {
      c.strokeStyle = 'rgba(181,123,255,.6)'; c.lineWidth = 2;
      c.beginPath(); c.arc(x, y + fly, r * 1.3, g.time * 2, g.time * 2 + 2.2); c.stroke();
    }
    /* 기절 */
    if (e.stun > 0) {
      for (let i = 0; i < 3; i++) {
        const a = g.time * 6 + i / 3 * U.TAU;
        c.fillStyle = '#ffe14d';
        c.beginPath(); c.arc(x + Math.cos(a) * r * .8, y + fly - r * 1.35 + Math.sin(a) * r * .2, r * .11, 0, U.TAU); c.fill();
      }
    }
    c.restore();

    /* 체력바 */
    const hpPct = e.hp / e.maxHp;
    if (hpPct < 1 || e.boss) {
      const bw = (e.boss ? r * 2.6 : r * 1.7), bh = e.boss ? 7 : 4.5;
      const bx = x - bw / 2, by = y + fly - r * (e.boss ? 1.65 : 1.4);
      c.fillStyle = 'rgba(0,0,0,.6)';
      c.beginPath(); c.roundRect(bx - 1, by - 1, bw + 2, bh + 2, 3); c.fill();
      const hc = hpPct > .5 ? '#5ce07a' : hpPct > .22 ? '#ffcc3f' : '#ff4d5e';
      c.fillStyle = hc;
      c.beginPath(); c.roundRect(bx, by, bw * hpPct, bh, 2); c.fill();
      if (e.shield > 0) {
        c.fillStyle = 'rgba(120,200,255,.9)';
        const sp = U.clamp(e.shield / e.maxShield, 0, 1);
        c.beginPath(); c.roundRect(bx, by - bh - 2, bw * sp, bh * .6, 2); c.fill();
      }
    }
  },

  /* ================================================== 투사체 */
  drawProj(c, p, g) {
    const col = p.color;
    const s = p.size;
    c.save();
    c.shadowColor = col; c.shadowBlur = 12;
    switch (p.kind) {
      case 'arrow': case 'bolt': case 'dart': {
        c.strokeStyle = col; c.lineWidth = s * .55; c.lineCap = 'round';
        const a = p.angle;
        c.beginPath();
        c.moveTo(p.x - Math.cos(a) * s * 3, p.y - Math.sin(a) * s * 3);
        c.lineTo(p.x + Math.cos(a) * s * 1.5, p.y + Math.sin(a) * s * 1.5);
        c.stroke();
        c.fillStyle = '#fff';
        c.beginPath(); c.arc(p.x + Math.cos(a) * s * 1.6, p.y + Math.sin(a) * s * 1.6, s * .32, 0, U.TAU); c.fill();
        break;
      }
      case 'bullet': {
        c.strokeStyle = col; c.lineWidth = s * .7;
        c.beginPath();
        c.moveTo(p.x - Math.cos(p.angle) * s * 6, p.y - Math.sin(p.angle) * s * 6);
        c.lineTo(p.x, p.y); c.stroke();
        break;
      }
      case 'ball': case 'orb': {
        const g2 = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, s * 2.2);
        g2.addColorStop(0, '#fff'); g2.addColorStop(.35, col); g2.addColorStop(1, U.rgba(col, 0));
        c.fillStyle = g2;
        c.beginPath(); c.arc(p.x, p.y, s * 2.2, 0, U.TAU); c.fill();
        break;
      }
      case 'shard': {
        c.fillStyle = col;
        c.save(); c.translate(p.x, p.y); c.rotate(p.angle + g.time * 8);
        c.beginPath(); c.moveTo(0, -s * 1.8); c.lineTo(s * .8, 0); c.lineTo(0, s * 1.8); c.lineTo(-s * .8, 0);
        c.closePath(); c.fill(); c.restore();
        break;
      }
      case 'bomb': {
        c.fillStyle = '#3a3f4a';
        c.beginPath(); c.arc(p.x, p.y, s * 1.3, 0, U.TAU); c.fill();
        c.fillStyle = col;
        c.beginPath(); c.arc(p.x, p.y, s * .6, 0, U.TAU); c.fill();
        break;
      }
      case 'wave': {
        c.strokeStyle = col; c.lineWidth = s * .8;
        c.beginPath(); c.arc(p.x, p.y, s * 2.4, p.angle - 1, p.angle + 1); c.stroke();
        break;
      }
    }
    c.shadowBlur = 0;
    c.restore();
  },

  /* ================================================== 빔/번개 */
  drawBeam(c, b, g) {
    const a = b.life / b.maxLife;
    c.save();
    c.globalAlpha = a;
    c.shadowColor = b.color; c.shadowBlur = 18;
    c.strokeStyle = b.color; c.lineWidth = b.width * (0.4 + a * 0.8);
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(b.pts[0].x, b.pts[0].y);
    for (let i = 1; i < b.pts.length; i++) c.lineTo(b.pts[i].x, b.pts[i].y);
    c.stroke();
    c.strokeStyle = '#fff'; c.lineWidth = b.width * .35 * a;
    c.stroke();
    c.shadowBlur = 0;
    c.restore();
  },

  /* ================================================== 지속 장판 */
  drawZone(c, z, g) {
    const a = U.clamp(z.life / z.maxLife, 0, 1);
    c.save();
    c.globalAlpha = .28 * a + .1;
    const grd = c.createRadialGradient(z.x, z.y, 0, z.x, z.y, z.r);
    grd.addColorStop(0, z.color); grd.addColorStop(1, U.rgba(z.color, 0));
    c.fillStyle = grd;
    c.beginPath(); c.arc(z.x, z.y, z.r, 0, U.TAU); c.fill();
    c.globalAlpha = .5 * a;
    c.strokeStyle = z.color; c.lineWidth = 2;
    c.setLineDash([8, 6]); c.lineDashOffset = -g.time * 20;
    c.beginPath(); c.arc(z.x, z.y, z.r, 0, U.TAU); c.stroke();
    c.setLineDash([]);
    c.restore();
  },

  /* ================================================== 화면 오버레이 */
  overlay(c, W, H) {
    if (FX.flashAlpha > 0.001) {
      c.fillStyle = U.rgba(FX.flashColor, FX.flashAlpha * .55);
      c.fillRect(0, 0, W, H);
    }
  },
  vignette(c, W, H, amt, color) {
    if (amt <= 0.001) return;
    const g = c.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .28, W / 2, H / 2, Math.max(W, H) * .72);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, U.rgba(color, amt));
    c.fillStyle = g; c.fillRect(0, 0, W, H);
  },
};

/* roundRect 폴리필 (구형 브라우저) */
if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
    if (w < 2 * r) r = w / 2; if (h < 2 * r) r = h / 2;
    this.beginPath();
    this.moveTo(x + r, y);
    this.arcTo(x + w, y, x + w, y + h, r);
    this.arcTo(x + w, y + h, x, y + h, r);
    this.arcTo(x, y + h, x, y, r);
    this.arcTo(x, y, x + w, y, r);
    this.closePath();
    return this;
  };
}

window.Draw = Draw;
