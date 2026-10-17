(() => {
  const roadmap = document.querySelector('[data-roadmap]');
  if (!roadmap) return;

  const search = roadmap.querySelector('#roadmap-search');
  const pathSelect = roadmap.querySelector('#roadmap-path');
  const jump = roadmap.querySelector('#roadmap-jump');
  const count = roadmap.querySelector('#roadmap-filter-count');
  const empty = roadmap.querySelector('#roadmap-empty');
  const sections = [...roadmap.querySelectorAll('.roadmap-section')];
  const sidebarGroups = [...roadmap.querySelectorAll('.roadmap-sidebar-group')];
  const links = [...roadmap.querySelectorAll('[data-roadmap-target]')];
  const topics = [...roadmap.querySelectorAll('.topic-card')];
  const normalize = (value) => value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  const index = topics.map((topic) => {
    const section = topic.closest('.roadmap-section');
    const title = topic.querySelector('.topic-summary > span').textContent;
    const context = `${title} ${section.dataset.title}`;
    const resources = [...topic.querySelectorAll('.resource-item')].map((element) => ({
      element,
      text: normalize(`${context} ${element.textContent}`),
    }));
    return { topic, section, resources };
  });
  const setOpen = (element, open) => { if (element.open !== open) element.open = open; };

  function syncSelection() {
    const current = topics.find((topic) => topic.open && !topic.hidden && topic.closest('.roadmap-section').open);
    jump.value = current?.id || '';
    links.forEach((link) => {
      if (link.dataset.roadmapTarget === current?.id) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }

  function openSection(selected) {
    sections.forEach((section) => {
      setOpen(section, section === selected);
      if (section !== selected) section.querySelectorAll('.topic-card').forEach((topic) => setOpen(topic, false));
    });
    sidebarGroups.forEach((group) => setOpen(group, group.dataset.section === selected.id));
    syncSelection();
  }

  function openTopic(selected) {
    openSection(selected.closest('.roadmap-section'));
    topics.forEach((topic) => setOpen(topic, topic === selected));
    syncSelection();
  }

  function collapseAll() {
    [...sections, ...topics, ...sidebarGroups].forEach((element) => setOpen(element, false));
    syncSelection();
  }

  function applyFilter() {
    const terms = normalize(search.value).split(' ').filter(Boolean);
    const filtering = terms.length > 0 || pathSelect.value !== '';
    let topicCount = 0;
    let resourceCount = 0;
    index.forEach(({ topic, section, resources }) => {
      const inPath = !pathSelect.value || section.id === pathSelect.value;
      let matches = 0;
      resources.forEach(({ element, text }) => {
        const match = inPath && terms.every((term) => text.includes(term));
        element.hidden = !match;
        if (match) matches += 1;
      });
      topic.hidden = matches === 0;
      if (matches) {
        topicCount += 1;
        resourceCount += matches;
      }
      if (topic.hidden) setOpen(topic, false);
      const metadata = topic.querySelector('.topic-meta');
      metadata.textContent = filtering ? `${matches} of ${resources.length} resources` : `${resources.length} resources`;
    });

    sections.forEach((section) => {
      const visibleTopics = [...section.querySelectorAll('.topic-card')].filter((topic) => !topic.hidden);
      section.hidden = visibleTopics.length === 0;
      if (section.hidden) setOpen(section, false);
      section.querySelector('.roadmap-section-meta').textContent = `${visibleTopics.length} ${visibleTopics.length === 1 ? 'topic' : 'topics'}`;
    });
    links.forEach((link) => {
      const topic = document.getElementById(link.dataset.roadmapTarget);
      link.parentElement.hidden = topic.hidden;
    });
    sidebarGroups.forEach((group) => {
      group.hidden = ![...group.querySelectorAll('li')].some((item) => !item.hidden);
      if (group.hidden) setOpen(group, false);
    });
    [...jump.options].forEach((option) => {
      if (option.value) option.disabled = document.getElementById(option.value).hidden;
    });
    if (jump.value && document.getElementById(jump.value).hidden) jump.value = '';

    // Search narrows the library without expanding every matching resource list.
    if (filtering && topicCount === 1) {
      openTopic(topics.find((topic) => !topic.hidden));
    } else if (filtering && !sections.some((section) => section.open && !section.hidden)) {
      const firstMatch = sections.find((section) => !section.hidden);
      if (firstMatch) openSection(firstMatch);
    }
    syncSelection();
    count.textContent = `${topicCount} ${topicCount === 1 ? 'topic' : 'topics'} · ${resourceCount} ${resourceCount === 1 ? 'resource' : 'resources'}${filtering ? ' matched' : ''}`;
    empty.hidden = topicCount !== 0;
  }

  function revealTopic(id, updateHash = true, scroll = true) {
    const topic = document.getElementById(id);
    if (!topic || !topic.classList.contains('topic-card')) return;
    if (topic.hidden) {
      search.value = '';
      pathSelect.value = '';
      applyFilter();
    }
    openTopic(topic);
    if (updateHash && window.location.hash !== `#${id}`) {
      window.history.pushState(null, '', `#${id}`);
    }
    if (scroll) {
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.requestAnimationFrame(() => {
        topic.scrollIntoView({ block: 'start', behavior: reducedMotion ? 'auto' : 'smooth' });
        topic.querySelector('summary').focus({ preventScroll: true });
      });
    }
  }

  function revealHash(scroll = true) {
    let id;
    try { id = decodeURIComponent(window.location.hash.slice(1)); }
    catch { return; }
    if (id) revealTopic(id, false, scroll);
    else collapseAll();
  }

  // Native details grouping also works without JavaScript in supporting browsers.
  // These listeners cover older browsers and browser-driven disclosure changes.
  sections.forEach((section) => section.addEventListener('toggle', () => {
    if (section.open && !section.hidden) openSection(section);
    else {
      section.querySelectorAll('.topic-card').forEach((topic) => setOpen(topic, false));
      sidebarGroups.filter((group) => group.dataset.section === section.id).forEach((group) => setOpen(group, false));
      syncSelection();
    }
  }));
  topics.forEach((topic) => topic.addEventListener('toggle', () => {
    if (topic.open && !topic.hidden) openTopic(topic);
    else syncSelection();
  }));
  sidebarGroups.forEach((group) => group.addEventListener('toggle', () => {
    if (group.open) sidebarGroups.filter((other) => other !== group).forEach((other) => setOpen(other, false));
  }));

  search.addEventListener('input', applyFilter);
  pathSelect.addEventListener('change', applyFilter);
  jump.addEventListener('change', () => { if (jump.value) revealTopic(jump.value); });
  links.forEach((link) => {
    link.addEventListener('click', (event) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      revealTopic(link.dataset.roadmapTarget);
    });
  });
  roadmap.querySelector('[data-roadmap-collapse]').addEventListener('click', collapseAll);
  roadmap.querySelector('[data-roadmap-reset]').addEventListener('click', () => {
    search.value = '';
    pathSelect.value = '';
    jump.value = '';
    applyFilter();
    search.focus();
  });
  window.addEventListener('hashchange', () => revealHash());

  applyFilter();
  roadmap.querySelector('[data-roadmap-controls]').hidden = false;
  revealHash();
})();
