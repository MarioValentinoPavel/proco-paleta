// Proco Paleta · interacción de la web
// - portada: la foto de antes se alisa con una pasada de llana y queda la de después (una vez)
// - el plano de la casa: cada oficio de la leyenda enciende su parte del dibujo
// - el baño paso a paso: cada foto entra con una pasada de llana al bajar
// - antes y después: se arrastra la línea (o flechas del teclado) sobre cada foto
// - pide presupuesto: el mensaje se escribe solo y se abre en WhatsApp o SMS
(() => {
  // Si el 643 041 171 no tiene WhatsApp, poner whatsapp: false y los botones de WhatsApp desaparecen.
  const SITE = { tel: '+34643041171', wa: '34643041171', whatsapp: true };

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const t = (m) => (window.I18N ? I18N.t(m) : m.es);

  if (!SITE.whatsapp) $$('[data-wa]').forEach((a) => { a.hidden = true; });

  // ---------- cabecera: menú del móvil ----------
  const menuBtn = $('.menu-btn'), menu = $('#menu');
  const setMenu = (open) => {
    menu.hidden = !open;
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? t({ es: 'Cerrar el menú', ca: 'Tanca el menú', ru: 'Закрыть меню' }) : t({ es: 'Abrir el menú', ca: 'Obre el menú', ru: 'Открыть меню' }));
    menuBtn.querySelector('use').setAttribute('href', open ? '#i-close' : '#i-menu');
    root.style.overflow = open ? 'hidden' : '';
  };
  menuBtn.addEventListener('click', () => setMenu(menu.hidden));
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) { setMenu(false); menuBtn.focus(); } });
  matchMedia('(min-width: 1081px)').addEventListener('change', (e) => { if (e.matches) setMenu(false); });

  // ---------- borde de llana: una línea con el pulso irregular del yeso ----------
  function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
  function edge(seed, n, amp) {
    const r = rng(seed), a = r() * 6.28, b = r() * 6.28, tilt = (r() - .5) * amp * 1.2;
    return Array.from({ length: n + 1 }, (_, i) => {
      const u = i / n;
      return Math.sin(u * 7.1 + a) * amp * .45 + Math.sin(u * 19.3 + b) * amp * .22 + (r() - .5) * amp * .5 + (u - .5) * tilt;
    });
  }
  // Polígono que deja ver la foto desde abajo hasta el borde (t: 0 nada, 1 entera). Devuelve también el borde en el centro.
  const AMP = 1.8;
  function sweep(pts, tt) {
    const y = 100 + AMP * 1.5 - tt * (100 + AMP * 3);
    let s = 'polygon(0% 100%, 100% 100%';
    for (let i = pts.length - 1; i >= 0; i--) s += `, ${(i / (pts.length - 1)) * 100}% ${(y + pts[i]).toFixed(2)}%`;
    const mid = pts[Math.round((pts.length - 1) / 2)];
    return { clip: s + ')', y: y + mid, tilt: pts[pts.length - 1] - pts[0] };
  }
  // Coloca la llana sobre el borde (y en % de la altura del marco)
  function placeTrowel(tr, frame, y, tilt, show) {
    const h = frame.clientHeight, w = frame.clientWidth, th = tr.getBoundingClientRect().height || w * 0.129;
    const px = (y / 100) * h - th * 0.86;
    const deg = Math.atan2((tilt / 100) * h, w) * 57.3;
    tr.style.transform = `translateY(${px.toFixed(1)}px) rotate(${deg.toFixed(2)}deg)`;
    tr.style.opacity = show ? '1' : '0';
  }
  const ease = (x) => (x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const decode = (img) => (img.complete && img.naturalWidth ? Promise.resolve() : (img.decode ? img.decode().catch(() => {}) : new Promise((r) => { img.onload = r; img.onerror = r; })));

  // ---------- ajuste de los títulos al ancho (eje de anchura de Science Gothic) ----------
  const probe = document.createElement('span');
  probe.setAttribute('aria-hidden', 'true');
  probe.style.cssText = 'position:absolute;left:-9999px;top:0;white-space:nowrap;visibility:hidden;font-size:100px;line-height:1;pointer-events:none';
  document.body.appendChild(probe);
  function measure(text, cs, stretch) {
    probe.style.fontFamily = cs.fontFamily; probe.style.fontWeight = cs.fontWeight; probe.style.textTransform = cs.textTransform;
    probe.style.letterSpacing = (parseFloat(cs.letterSpacing) / parseFloat(cs.fontSize) * 100 || 0) + 'px';
    probe.style.fontStretch = stretch + '%'; probe.textContent = text;
    return probe.getBoundingClientRect().width;
  }
  // Ancho que ocupa un texto a 100px con una anchura dada; interpola para encontrar la anchura que llena W.
  function stretchFor(text, cs, sizePx, W) {
    const w100 = measure(text, cs, 100), w200 = measure(text, cs, 200), w50 = measure(text, cs, 50);
    const target = (W * 100) / sizePx;
    let s = target >= w100 ? 100 + ((target - w100) / (w200 - w100)) * 100 : 50 + ((target - w50) / (w100 - w50)) * 50;
    s = clamp(s, 50, 200);
    // un paso de corrección
    const got = measure(text, cs, s);
    if (Math.abs(got - target) > 1) s = clamp(s * (target / got), 50, 200);
    return s;
  }
  function splitWords(el) {
    const words = el.textContent.trim().split(/\s+/);
    if (el.querySelector('.fw') && el.dataset.words === words.join(' ')) return;
    el.dataset.words = words.join(' ');
    // las palabras cortas («под», «de», «y») van en la misma línea que la siguiente
    const lines = [];
    words.forEach((w, i) => { const prev = lines[lines.length - 1]; if (prev && prev.split(' ').pop().length <= 3 && words[i - 1].length <= 3) lines[lines.length - 1] = prev + ' ' + w; else lines.push(w); });
    el.innerHTML = lines.map((w) => `<span class="fw">${w}</span>`).join(' ');
  }
  function fitHero() {
    const el = $('.fit-1'); if (!el) return;
    splitWords(el);
    const cs = getComputedStyle(el), W = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const words = $$('.fw', el);
    if (innerWidth > 860) {
      // una línea: tamaño común; si se pasa del máximo, se ensancha la letra hasta llenar
      // una línea: el cuerpo más grande que permita la pantalla; la anchura de la letra llena el ancho exacto
      words.forEach((w) => { w.style.fontStretch = ''; });
      const text = el.dataset.words, max = Math.min(96, innerHeight * 0.11), minStretch = 80;
      let size = max, stretch = stretchFor(text, cs, size, W);
      if (stretch <= minStretch) { stretch = minStretch; size = (W * 100) / measure(text, cs, minStretch); }
      el.style.setProperty('--fit-size', size.toFixed(2) + 'px');
      el.style.setProperty('--fit-stretch', stretch.toFixed(1) + '%');
    } else {
      // móvil: una palabra por línea, todas con el mismo cuerpo y el mismo ancho exacto
      const longest = words.reduce((m, w) => Math.max(m, measure(w.textContent, cs, 86)), 0);
      const size = Math.min((W * 100) / longest, 92);
      el.style.setProperty('--fit-size', size.toFixed(2) + 'px');
      el.style.setProperty('--fit-stretch', '100%');
      words.forEach((w) => { w.style.fontStretch = stretchFor(w.textContent, cs, size, W).toFixed(1) + '%'; });
    }
  }
  function fitFoot() {
    const el = $('.foot-word'); if (!el) return;
    const cs = getComputedStyle(el), W = el.clientWidth;
    const text = el.textContent.trim(), base = 150;
    let size = (W * 100) / measure(text, cs, base), stretch = base;
    if (size > 230) { size = 230; stretch = stretchFor(text, cs, size, W); }
    el.style.setProperty('--fit-size', size.toFixed(2) + 'px');
    el.style.setProperty('--fit-stretch', stretch.toFixed(1) + '%');
  }
  const fitAll = () => { fitHero(); fitFoot(); };
  let fitT = 0;
  addEventListener('resize', () => { cancelAnimationFrame(fitT); fitT = requestAnimationFrame(fitAll); });

  // ---------- 1 · portada ----------
  async function hero() {
    const hero = $('.hero'), door = $('[data-door]');
    if (!door) return;
    const a = $('.door-a', door), b = $('.door-b', door), tr = $('.trowel', door);
    const finish = () => { b.style.clipPath = 'none'; tr.style.opacity = '0'; root.classList.add('ready'); };
    if (reduce) { hero.classList.add('in'); finish(); return; }
    const pts = edge(7, 36, AMP);
    b.style.clipPath = sweep(pts, 0).clip;
    await Promise.race([Promise.all([decode(a), decode(b), document.fonts.ready]), wait(1800)]);
    hero.classList.add('in');
    await wait(520);
    const T = 1500, t0 = performance.now();
    await new Promise((done) => {
      const step = (now) => {
        const k = clamp((now - t0) / T, 0, 1), e = ease(k), s = sweep(pts, e);
        b.style.clipPath = s.clip;
        placeTrowel(tr, door, s.y, s.tilt, k > 0 && k < 1);
        if (k < 1) requestAnimationFrame(step); else done();
      };
      requestAnimationFrame(step);
    });
    finish();
  }

  // ---------- 2 · el plano: la leyenda enciende su zona ----------
  function plan() {
    const house = $('.house'); if (!house) return;
    const legs = $$('.leg');
    let pinned = null;
    const show = (z) => {
      house.classList.toggle('has-on', !!z);
      $$('.hs-z, .hs-c', house).forEach((g) => g.classList.toggle('on', g.dataset.zone === z));
    };
    legs.forEach((btn) => {
      const z = btn.dataset.zone;
      btn.addEventListener('mouseenter', () => show(z));
      btn.addEventListener('mouseleave', () => show(pinned));
      btn.addEventListener('focus', () => show(z));
      btn.addEventListener('blur', () => show(pinned));
      btn.addEventListener('click', () => {
        pinned = pinned === z ? null : z;
        legs.forEach((l) => l.setAttribute('aria-pressed', String(l.dataset.zone === pinned)));
        show(pinned);
      });
    });
    // tocar el número en el dibujo = tocar su oficio en la leyenda
    $$('.hs-c', house).forEach((c) => {
      c.style.cursor = 'pointer';
      c.addEventListener('click', () => $(`.leg[data-zone="${c.dataset.zone}"]`).click());
    });
  }

  // ---------- 3 · el baño, paso a paso ----------
  function steps() {
    const sec = $('[data-steps]'); if (!sec) return;
    const imgs = $$('.st-img', sec), panes = $$('.st-pane', sec), lis = $$('.steps-list li', sec);
    const cur = $('.st-cur', sec), bar = $('.st-bar', sec), tr = $('.st-trowel', sec), frame = $('.steps-frame', sec), track = $('.steps-track', sec);
    const N = imgs.length;
    if (reduce) {
      // todo quieto: cada paso con su foto, uno al lado del otro
      const list = document.createElement('ol');
      list.className = 'steps-static wrap';
      imgs.forEach((img, i) => {
        const li = document.createElement('li');
        img.removeAttribute('style'); img.className = '';
        li.append(img, ...[...panes[i].children]);
        list.append(li);
      });
      track.after(list);
      sec.classList.add('is-static');
      return;
    }
    const pts = imgs.map((_, i) => edge(31 + i * 17, 30, AMP));
    imgs.forEach((img, i) => { if (i) img.style.clipPath = sweep(pts[i], 0).clip; });
    let active = 0, raf = 0, near = false;
    const setActive = (k) => {
      if (k === active) return;
      active = k;
      panes.forEach((p, i) => p.classList.toggle('is-on', i === k));
      lis.forEach((l, i) => l.classList.toggle('is-on', i === k));
      cur.textContent = k + 1;
    };
    const update = () => {
      raf = 0;
      const head = parseFloat(getComputedStyle(root).getPropertyValue('--head')) || 76;
      const r = track.getBoundingClientRect(), stageH = innerHeight - head;
      const p = clamp((head - r.top) / Math.max(1, r.height - stageH), 0, 1);
      const c = p * N;
      let k = 0, live = null;
      for (let i = 1; i < N; i++) {
        const tt = clamp((c - (i - 0.35)) / 0.6, 0, 1);
        const s = sweep(pts[i], tt);
        imgs[i].style.clipPath = tt >= 1 ? 'none' : s.clip;
        if (tt >= 0.5) k = i;
        if (tt > 0 && tt < 1) live = s;
      }
      if (live) placeTrowel(tr, frame, live.y, live.tilt, true); else tr.style.opacity = '0';
      bar.style.setProperty('--p', p.toFixed(4));
      setActive(k);
    };
    const req = () => { if (near && !raf) raf = requestAnimationFrame(update); };
    new IntersectionObserver((es) => { near = es[0].isIntersecting; if (near) { imgs.forEach((i) => { i.loading = 'eager'; }); req(); } }, { rootMargin: '50% 0px' }).observe(sec);
    addEventListener('scroll', req, { passive: true });
    addEventListener('resize', req);
    update();
  }

  // ---------- 4 · antes y después ----------
  function compare() {
    $$('[data-cmp]').forEach((fig, n) => {
      const a = $('.cmp-a', fig), range = $('.cmp-range', fig);
      // borde vertical con el mismo pulso de yeso
      const off = edge(101 + n * 13, 24, 1).map((v) => (v * 3.2).toFixed(2));
      let poly = 'polygon(0% 0%';
      off.forEach((o, i) => { poly += `, calc(var(--x, 50%) + ${o}px) ${((i / (off.length - 1)) * 100).toFixed(2)}%`; });
      a.style.clipPath = poly + ', 0% 100%)';
      const tagA = $('.cmp-tag-a', fig), tagB = $('.cmp-tag-b', fig);
      let x = 50, drag = false;
      const set = (v) => {
        x = clamp(v, 0, 100);
        fig.style.setProperty('--x', x.toFixed(2) + '%');
        range.value = Math.round(x);
        range.setAttribute('aria-valuetext', `${tagA.textContent} ${Math.round(x)} %, ${tagB.textContent} ${100 - Math.round(x)} %`);
        fig.classList.toggle('hide-a', x < 24);
        fig.classList.toggle('hide-b', x > 76);
      };
      const fromEvent = (e) => { const r = fig.getBoundingClientRect(); set(((e.clientX - r.left) / r.width) * 100); };
      fig.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        drag = true; fig.classList.add('is-drag');
        try { fig.setPointerCapture(e.pointerId); } catch (_) { /* nada */ }
        fromEvent(e);
      });
      fig.addEventListener('pointermove', (e) => { if (drag) fromEvent(e); });
      const end = () => { drag = false; fig.classList.remove('is-drag'); };
      fig.addEventListener('pointerup', end);
      fig.addEventListener('pointercancel', end);
      range.addEventListener('input', () => set(+range.value));
      document.addEventListener('langchange', () => set(x));
      set(50);
    });
  }

  // ---------- 7 · pide presupuesto ----------
  function quote() {
    const form = $('#quote-form'); if (!form) return;
    const msg = $('#q-msg'), wa = $('#q-wa'), sms = $('#q-sms'), copyBtn = $('#q-copy'), err = $('#q-err'), status = $('#q-status');
    const L = () => t({
      es: { hi: 'Hola, Víctor. Te escribo desde tu web.', need: 'Quiero presupuesto para:', where: 'Dónde:', town: 'Población:', name: 'Me llamo', empty: 'Marca qué hay que hacer y el mensaje aparecerá aquí.', copied: 'Mensaje copiado.', fail: 'No se ha podido copiar: selecciona el texto y cópialo.' },
      ca: { hi: 'Hola, Víctor. T’escric des de la teva web.', need: 'Vull pressupost per a:', where: 'On:', town: 'Població:', name: 'Em dic', empty: 'Marca què s’ha de fer i el missatge apareixerà aquí.', copied: 'Missatge copiat.', fail: 'No s’ha pogut copiar: selecciona el text i copia’l.' },
      ru: { hi: 'Здравствуйте, Виктор. Пишу с вашего сайта.', need: 'Нужна смета:', where: 'Где:', town: 'Населённый пункт:', name: 'Меня зовут', empty: 'Отметьте, что нужно сделать, и здесь появится сообщение.', copied: 'Сообщение скопировано.', fail: 'Не удалось скопировать: выделите текст и скопируйте его.' }
    });
    const label = (inp) => inp.nextElementSibling.textContent.trim();
    const lower = (s) => s.charAt(0).toLocaleLowerCase(root.lang) + s.slice(1);
    let text = '';
    const compose = () => {
      const l = L();
      const trades = $$('input[name="t"]:checked', form).map(label);
      const w = $('input[name="w"]:checked', form);
      const town = form.elements.town.value.trim(), desc = form.elements.desc.value.trim(), name = form.elements.name.value.trim();
      const lines = [l.hi];
      if (trades.length) lines.push(`${l.need} ${trades.map(lower).join(', ')}.`);
      if (w) lines.push(`${l.where} ${lower(label(w))}.`);
      if (town) lines.push(`${l.town} ${town}.`);
      if (desc) lines.push(desc);
      if (name) lines.push(`${l.name} ${name}.`);
      const ok = trades.length > 0 || desc.length > 0;
      text = lines.join('\n');
      msg.textContent = ok || town || w || name ? text : l.empty;
      msg.classList.toggle('is-empty', !(ok || town || w || name));
      wa.href = `https://wa.me/${SITE.wa}?text=${encodeURIComponent(text)}`;
      sms.href = `sms:${SITE.tel}?&body=${encodeURIComponent(text)}`;
      if (ok) err.hidden = true;
      return ok;
    };
    const guard = (e) => {
      if (compose()) return true;
      if (e) e.preventDefault();
      err.hidden = false;
      $('input[name="t"]', form).focus();
      return false;
    };
    form.addEventListener('input', () => { status.textContent = ''; compose(); });
    form.addEventListener('submit', (e) => e.preventDefault());
    wa.addEventListener('click', guard);
    sms.addEventListener('click', guard);
    copyBtn.addEventListener('click', async () => {
      if (!guard()) return;
      try { await navigator.clipboard.writeText(text); status.textContent = L().copied; }
      catch (_) {
        const ta = document.createElement('textarea'); ta.value = text; ta.style.cssText = 'position:fixed;opacity:0'; document.body.append(ta); ta.select();
        status.textContent = document.execCommand('copy') ? L().copied : L().fail; ta.remove();
      }
    });
    document.addEventListener('langchange', compose);
    compose();
  }

  // ---------- barra del móvil: llamar y pedir presupuesto cuando el botón de la portada ya no se ve ----------
  function mbar() {
    const bar = $('#mbar'), heroBtn = $('.hero-l .btn'), quoteSec = $('#presupuesto'), foot = $('.foot');
    if (!bar || !('IntersectionObserver' in window)) return;
    const vis = new Map();
    const links = $$('a', bar);
    const update = () => {
      const show = vis.get(heroBtn) === false && !vis.get(quoteSec) && !vis.get(foot);
      bar.classList.toggle('show', show);
      bar.setAttribute('aria-hidden', String(!show));
      links.forEach((a) => (show ? a.removeAttribute('tabindex') : a.setAttribute('tabindex', '-1')));
    };
    const io = new IntersectionObserver((es) => { es.forEach((e) => vis.set(e.target, e.isIntersecting)); update(); });
    [heroBtn, quoteSec, foot].forEach((el) => el && io.observe(el));
  }

  // ---------- arranque ----------
  document.addEventListener('langchange', () => { fitAll(); });
  plan(); compare(); quote(); steps(); mbar();
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => { fitAll(); hero(); });
  // Si las fuentes tardan, el título no espera más de 1,2 s para ajustarse
  setTimeout(fitAll, 1200);
})();
