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
const artworkClasses = new Set(Array.from({ length: 12 }, (_, index) => `g${index + 1}`));
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
let matches = [];

function element(tagName, { className, text, attributes, dataset } = {}) {
  const node = document.createElement(tagName);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  for (const [name, value] of Object.entries(attributes ?? {})) node.setAttribute(name, value);
  for (const [name, value] of Object.entries(dataset ?? {})) node.dataset[name] = String(value);
  return node;
}

function artwork(art, empty = false) {
  const className = artworkClasses.has(art) ? `artwork ${art}` : 'artwork artwork--ghost';
  return element('span', {
    className,
    text: empty ? '?' : '',
    attributes: { 'aria-hidden': 'true' },
  });
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
      track.skipped || track.unmatched
        ? null
        : { title: track.title, artist: fixture.artist, art: track.art },
  }));
}

function selected() {
  return matches.filter((match) => match.state === 'matched' && match.selected);
}

function appendTrackTitle(container, track) {
  container.append(track.title);
  if (!track.note) return;
  container.append(
    element('span', {
      className: 'track-note',
      text: `— ${track.note}`,
    })
  );
}

function updatePreview() {
  document.getElementById('preview-artist').textContent = fixture.artist;
  document.getElementById('preview-venue').textContent = fixture.venue;
  document.getElementById('preview-date').textContent = fixture.date;
  document.getElementById('preview-count').textContent = String(fixture.tracks.length);
  const trackNodes = fixture.tracks.map((track) => {
    const title = element('span');
    appendTrackTitle(title, track);
    return element('li').appendChild(title).parentElement;
  });
  document.getElementById('preview-tracks').replaceChildren(...trackNodes);
}

function stateLabel(match) {
  if (match.state === 'matched') return ['Matched', 'matched'];
  if (match.state === 'skipped') return ['Skipped', 'skipped'];
  return ['Needs match', 'unmatched'];
}

function candidatesFor(match) {
  return (
    match.alternatives ?? [
      { title: match.title, artist: fixture.artist, art: match.art },
      { title: `${match.title} (Live)`, artist: fixture.artist, art: 'g10' },
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
  const panel = element('div', { className: 'search-panel', attributes: { role: 'search' } });
  const searchId = `search-${index}`;
  panel.append(
    element('label', {
      className: 'input-label',
      text: `Search local catalog options for ${match.title}`,
      attributes: { for: searchId },
    })
  );
  const controls = element('div', { className: 'search-controls' });
  const input = element('input', {
    className: 'input',
    attributes: { id: searchId, type: 'search' },
    dataset: { searchInput: index },
  });
  input.value = query;
  controls.append(input, button('Cancel', 'btn btn--secondary btn--sm', { searchClose: index }));
  panel.append(controls);
  const list = element('ul', {
    className: 'search-results',
    attributes: { 'aria-label': 'Local catalog options' },
  });
  for (const { candidate, candidateIndex } of results.length ? results : candidates) {
    const result = button('', 'search-result', { pick: index, candidate: candidateIndex });
    const resultText = element('span');
    resultText.append(
      element('span', { className: 'result-name', text: candidate.title }),
      element('span', { className: 'result-sub', text: candidate.artist })
    );
    result.append(
      artwork(candidate.art),
      resultText,
      element('span', { className: 'pick', text: 'Select', attributes: { 'aria-hidden': 'true' } })
    );
    list.append(element('li').appendChild(result).parentElement);
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
  const message = element('p');
  message.append(
    element('strong', {
      text: unresolved === 1 ? 'One song needs your ear. ' : `${unresolved} songs need your ear. `,
    }),
    'Search the local catalog options or skip the track.'
  );
  warning.replaceChildren(message);
}

function matchRow(match, index) {
  const state = matchStates.has(match.state) ? match.state : 'unmatched';
  const [label, statusClass] = stateLabel({ ...match, state });
  const result = match.selected;
  const action = state === 'skipped' ? 'Restore' : result ? 'Change' : 'Search';
  const row = element('li', { className: 'match-row', dataset: { matchState: state } });
  const main = element('div', { className: 'match-row-main' });
  const songCell = element('div', { className: 'song-cell' });
  const songTitle = element('strong');
  appendTrackTitle(songTitle, match);
  songCell.append(songTitle);
  const resultText = element('div', { className: 'result-text' });
  resultText.append(
    element('span', {
      className: 'result-name',
      text: result ? result.title : state === 'skipped' ? 'No match selected' : 'No match found',
    })
  );
  if (result) resultText.append(element('span', { className: 'result-sub', text: result.artist }));
  resultText.append(
    element('span', { className: `status-chip status-chip--${statusClass}`, text: label })
  );
  const resultCell = element('div', { className: 'result-cell' });
  resultCell.append(artwork(result?.art, !result), resultText);
  const actions = element('div', { className: 'row-actions' });
  actions.append(button(action, 'btn btn--quiet', { toggleSearch: index }));
  if (state !== 'skipped') actions.append(button('Skip', 'btn btn--quiet', { skip: index }));
  main.append(
    element('span', { className: 'row-no', text: String(index + 1).padStart(2, '0') }),
    songCell,
    resultCell,
    actions
  );
  row.append(main);
  if (openSearchIndex === index) row.append(searchPanel(match, index));
  return row;
}

function renderMatches() {
  const count = selected().length;
  const total = matches.length;
  const unresolved = matches.filter((match) => match.state === 'unmatched').length;
  const progress = `${(count / total) * 100}%`;
  document.getElementById('match-show').textContent = `${fixture.artist} at ${fixture.venue}`;
  document.getElementById('match-progress-label').textContent =
    `${count} of ${total} songs matched`;
  document.getElementById('match-progress-fill').style.width = progress;
  document.getElementById('stub-progress-fill').style.width = progress;
  document.getElementById('stub-count').textContent = String(count);
  document.getElementById('stub-total').textContent = `/${total}`;
  document.getElementById('stub-note').textContent = unresolved
    ? `${unresolved} song${unresolved === 1 ? '' : 's'} still need${unresolved === 1 ? 's' : ''} a choice.`
    : 'Every row is settled. Review the selected songs before continuing.';
  renderWarning(unresolved);
  matchList.replaceChildren(...matches.map(matchRow));
}

function updateExport() {
  const ready = selected();
  document.getElementById('export-lede').textContent =
    `${fixture.artist} · ${ready.length} selected`;
  document.getElementById('export-meta').textContent = `${fixture.venue} · ${fixture.date}`;
  document
    .getElementById('export-list')
    .replaceChildren(...ready.map((match) => element('li', { text: match.selected.title })));
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
    stageButton.dataset.state =
      next === 'success' || stepIndex < index
        ? 'complete'
        : stepIndex === index
          ? 'current'
          : 'upcoming';
    stageButton.toggleAttribute('aria-current', stepIndex === index && next !== 'success');
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
  if (control.dataset.toggleSearch !== undefined) {
    const index = Number(control.dataset.toggleSearch);
    if (!Number.isInteger(index) || !matches[index]) return;
    if (matches[index].state === 'skipped') {
      matches[index] = {
        ...matches[index],
        state: 'matched',
        selected: { title: matches[index].title, artist: fixture.artist, art: matches[index].art },
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
    openSearchIndex = null;
    renderMatches();
    workflowStatus.textContent = `${matches[index].title} updated with a local catalog choice.`;
    return;
  }
  if (control.hasAttribute('data-rematch')) {
    matches = defaults();
    openSearchIndex = null;
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
    document.getElementById('success-summary').textContent =
      `${playlistName.value.trim() || 'Untitled playlist'} contains ${selected().length} locally selected songs.`;
    showStage('success');
    return;
  }
  if (control.hasAttribute('data-reset')) {
    fixtureInput.value = fixture.id;
    importError.hidden = true;
    matches = defaults();
    playlistName.value = '';
    openSearchIndex = null;
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
