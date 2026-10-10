const fixture = {
  id: 'HV-FLM-260314',
  artist: 'Halcyon Vale',
  venue: 'The Fillmore, San Francisco',
  date: '14 March 2026',
  tracks: [
    { title: 'Glass Harbor', art: 'g1' },
    { title: 'Meridian', art: 'g2' },
    { title: 'Wilder Than the Wind', art: 'g3' },
    {
      title: 'Paper Lanterns',
      art: 'g4',
      alternatives: [
        { title: 'Paper Lanterns', artist: 'Halcyon Vale', art: 'g4' },
        { title: 'Paper Lanterns (Live at The Fillmore)', artist: 'Halcyon Vale', art: 'g9' },
        { title: 'Paper Lantern', artist: 'The Drift', art: 'g12' },
      ],
    },
    { title: 'Static Bloom', art: 'g5' },
    {
      title: 'Northern Line',
      note: 'acoustic',
      art: 'g6',
      unmatched: true,
      alternatives: [
        { title: 'Northern Line (Acoustic)', artist: 'Halcyon Vale', art: 'g6' },
        { title: 'Northern Lines', artist: 'Halcyon Vale', art: 'g11' },
        { title: 'North Line', artist: 'Hollow Vales', art: 'g8' },
      ],
    },
    { title: 'Cartographer', art: 'g7' },
    { title: 'Half-Light', art: 'g8' },
    { title: 'Undertow', art: 'g9', skipped: true },
    { title: 'Ember Days', art: 'g10' },
    { title: 'Slow Division', art: 'g11' },
    { title: 'Violet Hour', note: 'first time live', art: 'g12' },
  ],
};

const stageOrder = ['import', 'preview', 'match', 'export'];
const matchStates = new Set(['matched', 'skipped', 'unmatched']);
const stages = Object.fromEntries(
  [...document.querySelectorAll('section[data-state]')].map((element) => [
    element.dataset.state,
    element,
  ])
);
const stageButtons = [...document.querySelectorAll('[data-step]')];
const importForm = document.getElementById('import-form');
const fixtureInput = document.getElementById('setlist-input');
const importError = document.getElementById('import-error');
const workflowStatus = document.getElementById('workflow-status');
const matchList = document.getElementById('match-list');
const playlistName = document.getElementById('playlist-name');
let currentStage = 'import';
let openSearchIndex = null;
const expandedRows = new Set();
let matches = [];

function element(tagName, { className, text, attributes, dataset } = {}) {
  const node = document.createElement(tagName);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  for (const [name, value] of Object.entries(attributes ?? {})) node.setAttribute(name, value);
  for (const [name, value] of Object.entries(dataset ?? {})) node.dataset[name] = String(value);
  return node;
}

function setContext(id, parts) {
  document
    .getElementById(id)
    .replaceChildren(
      ...parts.flatMap((part, index) => [
        element('span', { className: 'step-context__part', text: part }),
        ...(index < parts.length - 1 ? [' · '] : []),
      ])
    );
}

function button(text, className, dataset = {}) {
  return element('button', {
    className,
    text,
    attributes: { type: 'button' },
    dataset,
  });
}

function defaults() {
  return fixture.tracks.map((track) => ({
    ...track,
    state: track.skipped ? 'skipped' : track.unmatched ? 'unmatched' : 'matched',
    selected:
      track.skipped || track.unmatched ? null : { title: track.title, artist: fixture.artist },
  }));
}

function selected() {
  return matches.filter((match) => match.state === 'matched' && match.selected);
}

function updatePreview() {
  document.getElementById('preview-title').textContent = fixture.artist;
  setContext('preview-context', [fixture.venue, fixture.date, `${fixture.tracks.length} songs`]);
  const trackNodes = fixture.tracks.map((track) => {
    const item = element('li', { className: 'preview-track-item' });
    item.append(element('span', { className: 'preview-track-name', text: track.title }));
    if (track.note)
      item.append(element('span', { className: 'preview-track-info', text: track.note }));
    return item;
  });
  document.getElementById('preview-tracks').replaceChildren(...trackNodes);
}

function candidatesFor(match) {
  return (
    match.alternatives ?? [
      { title: match.title, artist: fixture.artist },
      { title: `${match.title} (Live)`, artist: fixture.artist },
    ]
  );
}

function searchPanel(match, index) {
  const query = match.search ?? `${match.title} ${fixture.artist}`;
  const candidates = candidatesFor(match).map((candidate, candidateIndex) => ({
    candidate,
    candidateIndex,
  }));
  const results = candidates.filter(({ candidate }) =>
    `${candidate.title} ${candidate.artist}`.toLowerCase().includes(query.toLowerCase())
  );
  const panel = element('div', {
    className: 'track-search-panel',
    attributes: { role: 'search' },
  });
  const searchId = `search-${index}`;
  panel.append(
    element('label', {
      className: 'input-label',
      text: `Search local catalog options for ${match.title}`,
      attributes: { for: searchId },
    })
  );
  const controls = element('div', { className: 'track-search-controls' });
  const input = element('input', {
    className: 'input search-input',
    attributes: { id: searchId, type: 'search' },
    dataset: { searchInput: index },
  });
  input.value = query;
  controls.append(input, button('Cancel', 'button button--secondary', { searchClose: index }));
  panel.append(controls);
  const list = element('ul', {
    className: 'search-results-list',
    attributes: { 'aria-label': 'Local catalog options' },
  });
  for (const { candidate, candidateIndex } of results.length ? results : candidates) {
    const result = button('', 'search-result-button', { pick: index, candidate: candidateIndex });
    const resultText = element('span');
    resultText.append(
      candidate.title,
      element('span', { className: 'match-result-artist', text: candidate.artist })
    );
    result.append(
      resultText,
      element('span', { className: 'search-result-action', text: 'Use this recording' })
    );
    const item = element('li');
    item.append(result);
    list.append(item);
  }
  panel.append(list);
  return panel;
}

function renderWarning(unresolved) {
  const warning = document.getElementById('match-warning');
  warning.hidden = unresolved === 0;
  if (!unresolved) {
    warning.replaceChildren();
    return;
  }
  warning.replaceChildren(
    unresolved === 1 ? 'One song needs a choice. ' : `${unresolved} songs need a choice. `,
    'Use the ',
    element('strong', { text: 'Search' }),
    ' button to find a recording, or skip the song.'
  );
}

function statusChip(className, text) {
  const chip = element('span', { className });
  chip.append(element('span', { className: 'match-status', text }));
  return chip;
}

function matchRow(match, index) {
  const state = matchStates.has(match.state) ? match.state : 'unmatched';
  const result = match.selected;
  const expanded = expandedRows.has(index) || openSearchIndex === index;
  const detailsId = `match-details-${index}`;
  const row = element('li', {
    className: `matching-row matching-row--${state}${expanded ? ' matching-row--expanded' : ''}`,
  });
  const main = element('div', { className: 'matching-row-main' });
  const meta = element('div', { className: 'matching-track-meta' });
  meta.append(
    element('span', { className: 'matching-row-number', text: String(index + 1).padStart(2, '0') }),
    element('strong', { text: match.title })
  );
  if (match.note) meta.append(element('span', { className: 'muted-inline', text: match.note }));
  main.append(meta);
  if (result) {
    const toggle = element('button', {
      className: 'matching-row-toggle',
      attributes: {
        type: 'button',
        'aria-label': `Review recording for ${match.title}`,
        'aria-expanded': String(expanded),
        'aria-controls': detailsId,
      },
      dataset: { rowToggle: index },
    });
    toggle.append(
      'Selected ',
      element('span', { text: expanded ? '−' : '+', attributes: { 'aria-hidden': 'true' } })
    );
    main.append(toggle);
  }
  const resultCell = element('div', {
    className: 'matching-track-result',
    attributes: { id: detailsId },
  });
  if (result) {
    const primary = element('span', { className: 'match-result-primary', text: result.title });
    primary.append(element('span', { className: 'match-result-artist', text: result.artist }));
    const found = element('span', { className: 'match-found' });
    found.append(primary);
    resultCell.append(found);
  } else {
    const missing = element('span', {
      className: state === 'skipped' ? 'match-skipped' : 'match-missing',
    });
    missing.append(
      element('span', {
        className: 'match-result-primary',
        text: state === 'skipped' ? 'No match selected' : 'No suggestion',
      })
    );
    resultCell.append(missing);
  }
  main.append(resultCell);
  const actions = element('div', { className: 'matching-row-actions' });
  actions.append(
    result
      ? statusChip('match-found', 'Selected')
      : state === 'skipped'
        ? statusChip('match-skipped', 'Skipped')
        : statusChip('match-missing', 'Needs a choice')
  );
  const action = state === 'skipped' ? 'Restore' : result ? 'Change' : 'Search';
  const actionClass = result || state === 'skipped' ? 'button--quiet' : 'button--secondary';
  actions.append(
    element('button', {
      className: `button ${actionClass} button--compact`,
      text: action,
      attributes: {
        type: 'button',
        'aria-label': `${action === 'Restore' ? 'Restore' : 'Change match for'} ${match.title}`,
      },
      dataset: { toggleSearch: index },
    })
  );
  if (state !== 'skipped') {
    actions.append(
      element('button', {
        className: 'button button--quiet button--compact',
        text: 'Skip',
        attributes: { type: 'button', 'aria-label': `Skip ${match.title}` },
        dataset: { skip: index },
      })
    );
  }
  main.append(actions);
  row.append(main);
  if (openSearchIndex === index) row.append(searchPanel(match, index));
  return row;
}

function renderMatches() {
  const count = selected().length;
  const total = matches.length;
  const unresolved = matches.filter((match) => match.state === 'unmatched').length;
  const skipped = matches.filter((match) => match.state === 'skipped').length;
  document.getElementById('match-title').textContent = fixture.artist;
  setContext('match-context', [fixture.venue, fixture.date]);
  const progress = document.getElementById('match-progress');
  progress.replaceChildren(element('strong', { text: `${count} of ${total} selected` }));
  if (unresolved) {
    progress.append(` · ${unresolved} ${unresolved === 1 ? 'needs' : 'need'} a choice`);
  }
  if (skipped) progress.append(` · ${skipped} skipped`);
  document.getElementById('match-help').hidden = count > 0;
  document.getElementById('match-help').textContent = 'Match at least one song to continue.';
  document.getElementById('proceed-button').disabled = count === 0;
  renderWarning(unresolved);
  matchList.replaceChildren(...matches.map(matchRow));
}

function updateExport() {
  const ready = selected();
  document.getElementById('export-context').textContent =
    `${fixture.artist} · ${ready.length} songs selected`;
  document.getElementById('export-meta').textContent = `${fixture.venue} · ${fixture.date}`;
  document.getElementById('export-list').replaceChildren(
    ...ready.map((match, index) => {
      const item = element('li');
      item.append(
        element('span', { text: String(index + 1).padStart(2, '0') }),
        element('strong', { text: match.selected.title })
      );
      return item;
    })
  );
  if (!playlistName.value) playlistName.value = `Setlist – ${fixture.artist} – ${fixture.date}`;
}

function showStage(next, { moveFocus = true } = {}) {
  if (![...stageOrder, 'success'].includes(next)) return;
  currentStage = next;
  Object.entries(stages).forEach(([name, stage]) => {
    stage.hidden = name !== next;
  });
  const index = stageOrder.indexOf(next);
  stageButtons.forEach((stageButton, stepIndex) => {
    const step = stageButton.closest('li');
    const isCurrent = stepIndex === index && next !== 'success';
    step.classList.toggle('workflow-rail__step--current', isCurrent);
    step.classList.toggle('workflow-rail__step--complete', next === 'success' || stepIndex < index);
    if (isCurrent) step.setAttribute('aria-current', 'step');
    else step.removeAttribute('aria-current');
  });
  if (next === 'preview') updatePreview();
  if (next === 'match') renderMatches();
  if (next === 'export') updateExport();
  if (moveFocus) stages[next].querySelector('h1, h2')?.focus({ preventScroll: true });
  workflowStatus.textContent =
    next === 'success'
      ? 'Local preview created.'
      : `${next[0].toUpperCase()}${next.slice(1)} stage active.`;
}

function loadFixture() {
  if (fixtureInput.value.trim().toUpperCase() !== fixture.id) {
    importError.textContent = `Use the prepared fixture ID ${fixture.id}.`;
    importError.hidden = false;
    fixtureInput.setAttribute('aria-invalid', 'true');
    fixtureInput.focus();
    return;
  }
  importError.hidden = true;
  fixtureInput.removeAttribute('aria-invalid');
  matches = defaults();
  playlistName.value = '';
  openSearchIndex = null;
  expandedRows.clear();
  showStage('preview');
  workflowStatus.textContent = `${fixture.tracks.length}-song fixture loaded locally.`;
}

importForm.addEventListener('submit', (event) => {
  event.preventDefault();
  loadFixture();
});

document.addEventListener('click', (event) => {
  if (!(event.target instanceof Element)) return;
  const control = event.target.closest('button');
  if (!control) return;
  if (control.dataset.go) {
    showStage(control.dataset.go);
    return;
  }
  if (control.dataset.rowToggle !== undefined) {
    const index = Number(control.dataset.rowToggle);
    if (!Number.isInteger(index) || !matches[index]) return;
    const open = !expandedRows.has(index);
    if (open) expandedRows.add(index);
    else expandedRows.delete(index);
    control.closest('li').classList.toggle('matching-row--expanded', open);
    control.setAttribute('aria-expanded', String(open));
    control.lastElementChild.textContent = open ? '−' : '+';
    return;
  }
  if (control.dataset.toggleSearch !== undefined) {
    const index = Number(control.dataset.toggleSearch);
    if (!Number.isInteger(index) || !matches[index]) return;
    if (matches[index].state === 'skipped') {
      matches[index] = {
        ...matches[index],
        state: 'matched',
        selected: { title: matches[index].title, artist: fixture.artist },
      };
      workflowStatus.textContent = `${matches[index].title} restored with its local suggestion.`;
    } else {
      openSearchIndex = openSearchIndex === index ? null : index;
    }
    renderMatches();
    if (openSearchIndex !== null) document.getElementById(`search-${openSearchIndex}`)?.focus();
    return;
  }
  if (control.dataset.skip !== undefined) {
    const index = Number(control.dataset.skip);
    if (!Number.isInteger(index) || !matches[index]) return;
    matches[index] = { ...matches[index], state: 'skipped', selected: null };
    openSearchIndex = null;
    renderMatches();
    workflowStatus.textContent = `${matches[index].title} skipped from the local preview.`;
    return;
  }
  if (control.dataset.searchClose !== undefined) {
    openSearchIndex = null;
    renderMatches();
    return;
  }
  if (control.dataset.pick !== undefined) {
    const index = Number(control.dataset.pick);
    const candidateIndex = Number(control.dataset.candidate);
    const candidates = matches[index] ? candidatesFor(matches[index]) : [];
    if (
      !Number.isInteger(index) ||
      !Number.isInteger(candidateIndex) ||
      !candidates[candidateIndex]
    )
      return;
    matches[index] = { ...matches[index], state: 'matched', selected: candidates[candidateIndex] };
    expandedRows.add(index);
    openSearchIndex = null;
    renderMatches();
    workflowStatus.textContent = `${matches[index].title} updated with a local catalog choice.`;
    return;
  }
  if (control.hasAttribute('data-rematch')) {
    matches = defaults();
    openSearchIndex = null;
    expandedRows.clear();
    renderMatches();
    workflowStatus.textContent = 'Local suggestions restored.';
    return;
  }
  if (control.hasAttribute('data-skip-unresolved')) {
    matches = matches.map((match) =>
      match.state === 'unmatched' ? { ...match, state: 'skipped' } : match
    );
    openSearchIndex = null;
    renderMatches();
    workflowStatus.textContent = 'Unresolved songs skipped from the local preview.';
    return;
  }
  if (control.hasAttribute('data-create-preview')) {
    const count = selected().length;
    document.getElementById('success-name').textContent =
      playlistName.value.trim() || 'Untitled playlist';
    document.getElementById('success-count').textContent =
      `${count} ${count === 1 ? 'song' : 'songs'}`;
    showStage('success');
    return;
  }
  if (control.hasAttribute('data-reset')) {
    fixtureInput.value = fixture.id;
    importError.hidden = true;
    matches = defaults();
    playlistName.value = '';
    openSearchIndex = null;
    expandedRows.clear();
    showStage('import');
  }
});

matchList.addEventListener('input', (event) => {
  if (!(event.target instanceof HTMLInputElement) || !event.target.dataset.searchInput) return;
  const index = Number(event.target.dataset.searchInput);
  if (!Number.isInteger(index) || !matches[index]) return;
  matches[index] = { ...matches[index], search: event.target.value };
  renderMatches();
  document.getElementById(`search-${index}`)?.focus();
});

matches = defaults();
updatePreview();
showStage(currentStage, { moveFocus: false });
