// ==UserScript==
// @name         学习通 · 解除粘贴限制
// @namespace    cx-paste-unlock
// @version      2.0.0
// @description  解除学习通网页端（含 UEditor 富文本作答框）对「粘贴 / 复制 / 剪切 / 右键 / 选中」的限制，覆盖页面内所有 iframe
// @homepageURL  https://github.com/lizhengyang-byte/cx-paste-unlock
// @supportURL   https://github.com/lizhengyang-byte/cx-paste-unlock/issues
// @match        *://*.chaoxing.com/*
// @match        *://chaoxing.com/*
// @match        *://*.xuexitong.com/*
// @match        *://*.chaoxing.cn/*
// @match        *://*.cxfanya.com/*
// @match        *://*.cxerya.com/*
// @run-at       document-start
// @grant        none
// @license      MIT
// ==/UserScript==

(function () {
  'use strict';

  // 每个窗口（含 iframe）各自执行一次
  if (window.__CX_PASTE_UNLOCK__) return;
  window.__CX_PASTE_UNLOCK__ = true;

  /* ============ 可调配置 ============ */
  const CONFIG = {
    types: ['paste', 'copy', 'cut', 'contextmenu', 'selectstart', 'dragstart'],
    // 说明：不再粗暴丢弃全部 addEventListener('paste'...)，因为 UEditor 自己的
    // 粘贴管道也依赖 addEventListener，整体丢弃会让编辑器无法工作。
    // 真正的拦截在 UEditor.fireEvent('beforepaste') 阶段，见第 1 节。
    forceSelectable: true,
    showToast: true,
    debug: false
  };

  const TYPES = CONFIG.types;
  const ERR = function () {};
  const nativeAddEventListener = EventTarget.prototype.addEventListener;
  const nativePreventDefault = Event.prototype.preventDefault;

  /* ==================================================================
     1. 核心修复：破解 UEditor 的 beforepaste 拦截
     ----------------------------------------------------------------
     源码（作业作答.html:384）：
       function editorPaste(o, html){
           html.html = "";                       // 清空待粘贴内容
           $.toast({content:"只能录入不能粘贴!"});
           return false;
       }
       editor1.addListener('beforepaste', editorPaste);
     ueditor.all.min.js（约 9505 行）：
       html = { html: root.toHtml() };
       me.fireEvent('beforepaste', html, root);   // ← editorPaste 把 html.html 清空
       if (!html.html) { return; }                // ← 于是粘贴直接中止

     对策：劫持 UE.EventBase.prototype.fireEvent。
       - 若事件名是 beforepaste，则先备份 html.html 原文；
       - 监听器跑完后若被清空（或丢内容），立刻把原文写回；
       - 同时从剪贴板兜底，保证 html.html 一定非空。
     这样 editorPaste 仍然会被调用（不报错、不弹“只能录入不能粘贴”之外的东西），
     但它清空的内容会被我们瞬间还原，粘贴正常落地。
     ================================================================== */
  const fireEventHookedMap = new WeakSet();
  let lastClipboardText = '';

  // 尽量在 document-start 就拿到剪贴板原文（paste 捕获阶段记录）
  const rememberClipboard = function (e) {
    try {
      if (e.clipboardData) {
        const t = e.clipboardData.getData('text/plain') || e.clipboardData.getData('text');
        if (t) lastClipboardText = t;
      }
    } catch (err) { ERR(); }
  };
  nativeAddEventListener.call(window, 'paste', rememberClipboard, true);

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br/>');
  }

  function hookEventBase(UE) {
    if (!UE || !UE.EventBase || !UE.EventBase.prototype) return false;
    const proto = UE.EventBase.prototype;
    if (proto.__cxHooked) return true;
    const origFire = proto.fireEvent;
    if (typeof origFire !== 'function') return false;

    proto.fireEvent = function (types) {
      // 只处理 beforepaste 这一个事件
      const isBeforePaste = typeof types === 'string' &&
        types.split(' ').indexOf('beforepaste') !== -1;
      if (!isBeforePaste) {
        return origFire.apply(this, arguments);
      }

      const html = arguments[1];
      const backup = (html && typeof html.html === 'string') ? html.html : '';
      const ret = origFire.apply(this, arguments);

      // 监听器（editorPaste）执行后，html.html 被清空 → 还原
      if (html && typeof html === 'object') {
        if (!html.html && backup) {
          html.html = backup;
          if (CONFIG.debug) console.info('[CX-Paste] 已还原被清空的粘贴内容');
        }
        // 极端兜底：整段内容仍为空，用剪贴板文本重建
        if (!html.html && lastClipboardText) {
          html.html = '<p>' + escapeHtml(lastClipboardText) + '</p>';
          if (CONFIG.debug) console.info('[CX-Paste] 用剪贴板兜底重建粘贴内容');
        }
        if (html.html && CONFIG.showToast) notify('粘贴已解除限制');
      }
      return ret;
    };
    proto.__cxHooked = true;
    if (CONFIG.debug) console.info('[CX-Paste] 已 hook UE.EventBase.fireEvent');
    return true;
  }

  // UE 通常在脚本加载后才挂到 window，需轮询等待
  (function waitForUE() {
    let tries = 0;
    const timer = setInterval(function () {
      tries++;
      if (hookEventBase(window.UE)) {
        clearInterval(timer);
      } else if (tries > 200) { // 约 20s 后放弃
        clearInterval(timer);
      }
    }, 100);
    // document-start 时如已存在（同域重入）先试一次
    hookEventBase(window.UE);
  })();

  /* ==================================================================
     2. 兜底：直接把 window.editorPaste 换成“不清空”的版本
     若页面把 editorPaste 定义成全局函数，替换后即使不靠 fireEvent hook 也能生效。
     ================================================================== */
  try {
    let _editorPaste = window.editorPaste;
    Object.defineProperty(window, 'editorPaste', {
      configurable: true,
      get: function () { return _editorPaste; },
      set: function () {
        // 忽略页面对 editorPaste 的赋值，改为安装放行版
        _editorPaste = function (o, html) {
          // 不清空 html.html，直接让 UEditor 走默认粘贴流程
          return true;
        };
      }
    });
  } catch (e) { ERR(); }

  /* ==================================================================
     3. 让 preventDefault() 对受限事件失效（DOM 层兜底）
     ================================================================== */
  Event.prototype.preventDefault = function () {
    try {
      if (this.isTrusted && TYPES.indexOf(this.type) !== -1) {
        if (CONFIG.debug) console.info('[CX-Paste] 已忽略 preventDefault:', this.type);
        return;
      }
    } catch (e) { ERR(); }
    return nativePreventDefault.call(this);
  };

  /* ==================================================================
     4. 让 onpaste / oncopy / oncontextmenu 等属性失效
     ================================================================== */
  const deadHandlers = new WeakMap();
  function neutralizeHandlerProp(target, prop) {
    try {
      const desc = Object.getOwnPropertyDescriptor(target, prop);
      Object.defineProperty(target, prop, {
        configurable: true,
        enumerable: desc ? desc.enumerable : true,
        get: function () { return deadHandlers.get(this) || null; },
        set: function (fn) { deadHandlers.set(this, fn); }
      });
    } catch (e) { ERR(); }
  }

  const handlerHosts = [window, Window.prototype, Document.prototype, Element.prototype];
  ['paste', 'copy', 'cut', 'contextmenu', 'selectstart', 'dragstart'].forEach(function (type) {
    const prop = 'on' + type;
    handlerHosts.forEach(function (host) {
      if (host) neutralizeHandlerProp(host, prop);
    });
  });

  /* ==================================================================
     5. 清理元素上的 onxxx 内联属性 + MutationObserver 盯新增节点
     ================================================================== */
  const ATTRS = TYPES.map(function (t) { return 'on' + t; });

  function stripAttrs(el) {
    if (!el || el.nodeType !== 1) return;
    for (let i = 0; i < ATTRS.length; i++) {
      try {
        if (el.hasAttribute && el.hasAttribute(ATTRS[i])) el.removeAttribute(ATTRS[i]);
      } catch (e) { ERR(); }
    }
  }

  function sweep(root) {
    if (!root) return;
    stripAttrs(root);
    if (!root.querySelectorAll) return;
    let list;
    try { list = root.querySelectorAll('*'); } catch (e) { return; }
    for (let i = 0; i < list.length; i++) stripAttrs(list[i]);
  }

  sweep(document.documentElement);
  nativeAddEventListener.call(document, 'DOMContentLoaded', function () {
    sweep(document.documentElement);
  }, true);

  try {
    const observer = new MutationObserver(function (records) {
      for (let i = 0; i < records.length; i++) {
        const r = records[i];
        if (r.type === 'childList' && r.addedNodes) {
          for (let j = 0; j < r.addedNodes.length; j++) {
            if (r.addedNodes[j].nodeType === 1) sweep(r.addedNodes[j]);
          }
        } else if (r.type === 'attributes' && r.attributeName && ATTRS.indexOf(r.attributeName) !== -1) {
          stripAttrs(r.target);
        }
      }
    });
    const startObserve = function () {
      if (document.documentElement) {
        observer.observe(document.documentElement, {
          childList: true, subtree: true, attributes: true, attributeFilter: ATTRS
        });
      }
    };
    startObserve();
    nativeAddEventListener.call(document, 'readystatechange', startObserve, true);
  } catch (e) { ERR(); }

  /* ==================================================================
     6. 强制可选中（应对 user-select: none）
     ================================================================== */
  function injectCSS() {
    if (!CONFIG.forceSelectable) return;
    try {
      const style = document.createElement('style');
      style.id = 'cx-paste-unlock-style';
      style.textContent =
        '*,*::before,*::after{-webkit-user-select:text!important;-moz-user-select:text!important;' +
        '-ms-user-select:text!important;user-select:text!important;}';
      (document.head || document.documentElement).appendChild(style);
    } catch (e) { ERR(); }
  }
  if (document.documentElement) injectCSS();
  else nativeAddEventListener.call(document, 'readystatechange', injectCSS, true);

  /* ==================================================================
     7. 兜底补粘：对普通 input / textarea / contenteditable
     （UEditor 的作答框走 iframe，此节主要覆盖其它输入点）
     ================================================================== */
  function isEditable(el) {
    if (!el) return false;
    if (el instanceof HTMLTextAreaElement) return !el.readOnly && !el.disabled;
    if (el instanceof HTMLInputElement) {
      const t = (el.type || '').toLowerCase();
      if (t === 'hidden' || t === 'file' || t === 'checkbox' || t === 'radio') return false;
      return !el.readOnly && !el.disabled;
    }
    return !!el.isContentEditable;
  }

  function captureState(el) {
    if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
      return { kind: 'input', value: el.value, start: el.selectionStart, end: el.selectionEnd };
    }
    let range = null;
    try {
      const sel = window.getSelection();
      if (sel && sel.rangeCount) range = sel.getRangeAt(0).cloneRange();
    } catch (e) { ERR(); }
    return { kind: 'editable', html: el.innerHTML, range: range };
  }

  function setNativeValue(el, value) {
    const proto = el instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const desc = Object.getOwnPropertyDescriptor(proto, 'value');
    if (desc && desc.set) desc.set.call(el, value);
    else el.value = value;
    try {
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    } catch (e) { ERR(); }
  }

  function insertIntoInput(el, text, state) {
    if (!isEditable(el)) return;
    const value = el.value == null ? '' : el.value;
    const total = value.length;
    let start = typeof state.start === 'number' ? state.start : total;
    let end = typeof state.end === 'number' ? state.end : start;
    if (start < 0 || start > total) start = total;
    if (end < start || end > total) end = start;
    const next = value.slice(0, start) + text + value.slice(end);
    setNativeValue(el, next);
    try {
      const pos = start + text.length;
      el.setSelectionRange(pos, pos);
    } catch (e) { ERR(); }
    notify('已自动补上粘贴内容');
  }

  function insertIntoEditable(el, text, state) {
    try {
      el.focus();
      const sel = window.getSelection();
      if (sel && state.range) { sel.removeAllRanges(); sel.addRange(state.range); }
      const ok = document.execCommand('insertText', false, text);
      if (!ok && state.range) {
        state.range.deleteContents();
        state.range.insertNode(document.createTextNode(text));
      }
      notify('已自动补上粘贴内容');
    } catch (e) { ERR(); }
  }

  nativeAddEventListener.call(window, 'paste', function (e) {
    const target = e.target;
    if (!isEditable(target)) return;
    let text = '';
    try { text = e.clipboardData ? e.clipboardData.getData('text/plain') : ''; } catch (err) { ERR(); }
    if (!text) return;
    const state = captureState(target);
    setTimeout(function () {
      try {
        if (state.kind === 'input') {
          if (target.value === state.value) insertIntoInput(target, text, state);
        } else if (target.innerHTML === state.html) {
          insertIntoEditable(target, text, state);
        }
      } catch (err) { ERR(); }
    }, 20);
  }, true);

  /* ==================================================================
     8. 轻提示
     ================================================================== */
  let toastTimer = null;
  function notify(msg) {
    if (!CONFIG.showToast) return;
    try {
      let tip = document.getElementById('cx-paste-unlock-tip');
      if (!tip) {
        tip = document.createElement('div');
        tip.id = 'cx-paste-unlock-tip';
        tip.style.cssText = [
          'position:fixed', 'right:16px', 'bottom:16px', 'z-index:2147483647',
          'padding:8px 14px', 'border-radius:8px',
          'background:rgba(24,144,255,.92)', 'color:#ffffff',
          'font:13px/1.4 -apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif',
          'box-shadow:0 4px 14px rgba(0,0,0,.18)', 'pointer-events:none',
          'opacity:0', 'transition:opacity .18s ease'
        ].join(';');
        (document.body || document.documentElement).appendChild(tip);
      }
      tip.textContent = msg;
      tip.style.opacity = '1';
      clearTimeout(toastTimer);
      toastTimer = setTimeout(function () { tip.style.opacity = '0'; }, 1600);
    } catch (e) { ERR(); }
  }

  if (CONFIG.debug) console.info('[CX-Paste] 解除粘贴限制已生效 v2.0.0');
})();

