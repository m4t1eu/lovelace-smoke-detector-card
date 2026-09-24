/**
 * Smoke Detector Card — compact Lovelace card for Zigbee smoke detectors.
 * https://github.com/m4t1eu/lovelace-smoke-detector-card
 * License: MIT
 */
const VERSION = '__VERSION__';

// Entity keys and the Zigbee2MQTT naming used to derive them from `device`.
const ENTITIES = {
  smoke: ['binary_sensor', '_smoke'],
  battery: ['sensor', '_battery'],
  battery_low: ['binary_sensor', '_battery_low'],
  temperature: ['sensor', '_temperature'],
  fault: ['sensor', '_fault_state'],
  test: ['binary_sensor', '_test'],
  contamination: ['sensor', '_chamber_contamination'],
  muted: ['sensor', '_muted'],
  mute: ['switch', '_temporary_mute'],
  smoke_level: ['sensor', '_smoke_level'],
  linkquality: ['sensor', '_linkquality'],
  rejoin_count: ['sensor', '_rejoin_count'],
  reboot_count: ['sensor', '_reboot_count'],
  selftest: ['button', '_trigger_selftest'],
  identify: ['button', '_identify'],
  update: ['update', ''],
  last_seen: ['sensor', '_last_seen'],
};

// Entities whose timestamps do not reflect a report from the device.
const NOT_REPORTS = ['selftest', 'identify', 'update', 'last_seen'];

const STRINGS = {
  en: {
    ok: 'OK', smoke: 'Smoke!', unavailable: 'Unavailable', fault: 'Fault', dirty: 'Dirty chamber',
    stale: 'No report', low_battery: 'Low battery', muted: 'Muted', test: 'Testing', not_found: 'Entity not found',
    more: 'More', close: 'Close', health: 'Health', actions: 'Actions', last_seen: 'Last seen',
    battery: 'Battery', temperature: 'Temperature', linkquality: 'Link quality', rejoins: 'Rejoins (total)',
    last_change: 'Last change', reboots: 'Reboots', chamber: 'Detection chamber',
    smoke_level: 'Smoke level', mute: 'Mute', muted_on: 'Muted', identify: 'Identify', selftest: 'Self-test',
    selftest_warning: 'The siren will sound at full volume. Run the self-test?', confirm: 'Run', cancel: 'Cancel',
    firmware: 'Firmware', update_available: 'Update {v} available', device: 'Device page', now: 'just now',
    ago: '{t} ago', day: 'd', normal: 'Normal', kind: 'Smoke detector',
  },
  fr: {
    ok: 'RAS', smoke: 'FUMÉE !', unavailable: 'Injoignable', fault: 'Défaut', dirty: 'Encrassé',
    stale: 'Aucune nouvelle', low_battery: 'Batt. faible', muted: 'Son coupé', test: 'Test en cours',
    not_found: 'Entité introuvable', more: "Plus d'infos", close: 'Fermer', health: 'Santé', actions: 'Actions',
    last_seen: 'Dernier contact', battery: 'Batterie', temperature: 'Température', linkquality: 'Qualité de liaison',
    rejoins: 'Reconnexions (total)', last_change: 'Dernier changement', reboots: 'Redémarrages',
    chamber: 'Chambre de détection', smoke_level: 'Niveau de fumée', mute: 'Couper le son', muted_on: 'Son coupé',
    identify: 'Identifier', selftest: 'Autotest',
    selftest_warning: "La sirène va sonner à pleine puissance. Lancer l'autotest ?", confirm: 'Lancer',
    cancel: 'Annuler', firmware: 'Firmware', update_available: 'Mise à jour {v} disponible',
    device: "Voir l'appareil", now: "à l'instant", ago: 'il y a {t}', day: 'j', normal: 'Normal',
    kind: 'Détecteur de fumée',
  },
};

const COLORS = {
  alarm: 'var(--error-color, #db4437)',
  warning: 'var(--warning-color, #ffa600)',
  ok: 'var(--success-color, #43a047)',
  unavailable: 'var(--disabled-color, #bdbdbd)',
  info: 'var(--info-color, #039be5)',
  muted: 'var(--secondary-text-color, #727272)',
};

const UNAVAILABLE = ['unavailable', 'unknown'];
const ICON = 'mdi:smoke-detector-variant';

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const fill = (tpl, vars) => tpl.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');

const num = (stateObj) => {
  const v = Number(stateObj?.state);
  return stateObj && Number.isFinite(v) ? v : undefined;
};

const available = (stateObj) => Boolean(stateObj) && !UNAVAILABLE.includes(stateObj.state);

const batteryIcon = (v) => {
  if (v >= 95) return 'mdi:battery';
  if (v < 10) return 'mdi:battery-outline';
  return `mdi:battery-${Math.floor(v / 10) * 10}`;
};

const STYLE = `
  :host { display: block; height: 100%; }
  #face { height: 100%; }
  ha-card {
    position: relative;
    container-type: inline-size;
    height: 100%;
    box-sizing: border-box;
    padding: 44px 16px 16px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
  }
  ha-card.alarm { --ha-card-border-color: var(--sdc-color); --ha-card-border-width: 2px; }
  button { font: inherit; }
  .icon-btn {
    width: 32px;
    height: 32px;
    border: none;
    border-radius: 50%;
    background: none;
    color: var(--secondary-text-color);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    flex: none;
  }
  .icon-btn:hover { background: color-mix(in srgb, var(--primary-text-color) 8%, transparent); }
  .icon-btn ha-icon { --mdc-icon-size: 20px; }
  .more { position: absolute; top: 6px; right: 6px; }
  .kind { position: absolute; top: 12px; left: 12px; --mdc-icon-size: 20px; color: var(--secondary-text-color); }
  .alarm .kind { color: var(--sdc-color); }
  .main {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    cursor: pointer;
    outline: none;
    border-radius: 12px;
  }
  [role='button']:focus-visible, button:focus-visible { outline: 2px solid var(--primary-color); outline-offset: 2px; }
  .icon {
    position: relative;
    width: 48px;
    height: 48px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--sdc-color);
    background: color-mix(in srgb, var(--sdc-color) 20%, transparent);
    flex: none;
  }
  .main .icon { margin-bottom: 6px; }
  .icon ha-icon { --mdc-icon-size: 28px; }
  .badge {
    position: absolute;
    top: -4px;
    right: -4px;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--sdc-color);
    color: var(--text-primary-color, #fff);
  }
  .badge ha-icon { --mdc-icon-size: 14px; }
  .name { font-size: 16px; font-weight: 500; text-align: center; color: var(--primary-text-color); }
  .status { font-size: 14px; color: var(--secondary-text-color); }
  .alarm .status, .warning .status { color: var(--sdc-color); font-weight: 500; }
  .alarm .icon { animation: sdc-pulse 1.2s ease-in-out infinite; }
  @keyframes sdc-pulse {
    0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--sdc-color) 60%, transparent); }
    50% { box-shadow: 0 0 0 10px transparent; }
  }
  @media (prefers-reduced-motion: reduce) { .alarm .icon { animation: none; } }
  .chips { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; }
  .chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border-radius: 18px;
    border: 1px solid var(--divider-color);
    color: var(--primary-text-color);
    font-size: 13px;
    font-weight: 500;
  }
  .chip ha-icon { --mdc-icon-size: 18px; color: var(--chip-color); }
  .short { display: none; }
  @container (max-width: 200px) {
    .chips { display: grid; grid-template-columns: repeat(auto-fit, minmax(0, 1fr)); width: 100%; gap: 2px; }
    .chip { flex-direction: column; gap: 2px; padding: 4px 0; border: none; font-size: 12px; white-space: nowrap; }
    .chip ha-icon { --mdc-icon-size: 18px; }
    .long { display: none; }
    .short { display: inline; }
  }
  .alarm-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    border: none;
    border-radius: 18px;
    background: var(--sdc-color);
    color: var(--text-primary-color, #fff);
    font-weight: 600;
    cursor: pointer;
  }
  .alarm-btn ha-icon { --mdc-icon-size: 18px; }

  dialog {
    padding: 0;
    border: none;
    border-radius: 16px;
    width: min(440px, calc(100vw - 32px));
    max-height: calc(100vh - 64px);
    background: var(--card-background-color, var(--ha-card-background, #fff));
    color: var(--primary-text-color);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  }
  dialog::backdrop { background: rgba(0, 0, 0, 0.45); }
  @media (max-width: 600px) {
    dialog {
      width: 100vw;
      max-width: 100vw;
      margin: auto 0 0 0;
      border-radius: 16px 16px 0 0;
      max-height: 85vh;
    }
  }
  .sheet { padding: 16px 20px 20px; display: flex; flex-direction: column; gap: 20px; outline: none; }
  .sheet header { display: flex; align-items: center; gap: 12px; }
  .sheet header .icon { width: 44px; height: 44px; }
  .sheet header .icon ha-icon { --mdc-icon-size: 24px; }
  .titles { flex: 1; min-width: 0; }
  .titles .name { text-align: left; font-size: 18px; }
  h3 {
    margin: 0 0 8px;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--secondary-text-color);
  }
  .rows { list-style: none; margin: 0; padding: 0; border: 1px solid var(--divider-color); border-radius: 12px; overflow: hidden; }
  .rows li { display: flex; align-items: center; gap: 12px; padding: 10px 12px; cursor: pointer; }
  .rows li + li { border-top: 1px solid var(--divider-color); }
  .rows li:hover { background: color-mix(in srgb, var(--primary-text-color) 5%, transparent); }
  .rows ha-icon { --mdc-icon-size: 20px; color: var(--row-color, var(--secondary-text-color)); }
  .rows .label { flex: 1; }
  .rows .value { font-weight: 500; text-align: right; }
  .rows .sub { display: block; font-size: 12px; font-weight: 400; color: var(--secondary-text-color); }
  .actions { display: grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); gap: 8px; }
  .action {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 12px 8px;
    border: 1px solid var(--divider-color);
    border-radius: 12px;
    background: none;
    color: var(--primary-text-color);
    font-size: 13px;
    cursor: pointer;
  }
  .action ha-icon { --mdc-icon-size: 24px; color: var(--primary-color); }
  .action.danger ha-icon { color: var(--error-color, #db4437); }
  .action:disabled { opacity: 0.5; cursor: default; }
  .confirm {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 12px;
    border: 1px solid var(--error-color, #db4437);
    border-radius: 12px;
    background: color-mix(in srgb, var(--error-color, #db4437) 10%, transparent);
  }
  .confirm p { margin: 0; display: flex; gap: 8px; align-items: flex-start; }
  .confirm p ha-icon { color: var(--error-color, #db4437); flex: none; }
  .confirm .buttons { display: flex; gap: 8px; justify-content: flex-end; }
  .btn { padding: 8px 16px; border: none; border-radius: 18px; background: none; color: var(--primary-color); font-weight: 600; cursor: pointer; }
  .btn.danger { background: var(--error-color, #db4437); color: #fff; }
  .sheet footer {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 8px 16px;
    font-size: 13px;
    color: var(--secondary-text-color);
  }
  .update { color: var(--warning-color, #ffa600); font-weight: 500; }
  .link { padding: 0; border: none; background: none; color: var(--primary-color); cursor: pointer; }
`;

class SmokeDetectorCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `<style>${STYLE}</style><div id="face"></div><dialog id="panel"></dialog>`;
    this._face = this.shadowRoot.getElementById('face');
    this._dialog = this.shadowRoot.getElementById('panel');
    this._confirmSelftest = false;
    this.shadowRoot.addEventListener('click', (ev) => this._onClick(ev));
    this.shadowRoot.addEventListener('keydown', (ev) => {
      if ((ev.key === 'Enter' || ev.key === ' ') && ev.target.getAttribute?.('role') === 'button') {
        ev.preventDefault();
        this._onClick(ev);
      }
    });
    this._dialog.addEventListener('close', () => {
      this._confirmSelftest = false;
    });
  }

  static getStubConfig(hass) {
    const smoke = Object.keys(hass.states).find((id) => id.startsWith('binary_sensor.') && id.endsWith('_smoke'));
    return { device: smoke ? smoke.slice('binary_sensor.'.length, -'_smoke'.length) : 'my_smoke_detector' };
  }

  setConfig(config) {
    if (!config || (!config.device && !config.entities?.smoke)) {
      throw new Error('Define `device` (Zigbee2MQTT entity prefix) or `entities.smoke`');
    }
    this._config = { battery_warning: 20, stale_after: 180, kind_icon: 'mdi:fire', ...config };
    this._entities = {};
    for (const [key, [domain, suffix]] of Object.entries(ENTITIES)) {
      this._entities[key] = config.entities?.[key] ?? (config.device ? `${domain}.${config.device}${suffix}` : undefined);
    }
    this._update();
  }

  set hass(hass) {
    this._hass = hass;
    this._update();
  }

  connectedCallback() {
    // Keep "last seen" fresh even when no state changes.
    clearInterval(this._timer);
    this._timer = setInterval(() => this._update(), 60000);
  }

  disconnectedCallback() {
    clearInterval(this._timer);
  }

  getCardSize() {
    return 3;
  }

  getGridOptions() {
    return { columns: 6, rows: 'auto', min_columns: 3 };
  }

  // ---------------------------------------------------------------- data

  _state(key) {
    const id = this._entities?.[key];
    return id ? this._hass?.states[id] : undefined;
  }

  _lang() {
    return (this._hass?.locale?.language || this._hass?.language || 'en').split('-')[0];
  }

  _t() {
    return STRINGS[this._lang()] || STRINGS.en;
  }

  // Returns { ts, reliable }. Only the Zigbee2MQTT last_seen sensor tells when the device last reported:
  // the frontend only exposes last_changed / last_updated, which do not move when values stay the same.
  _lastSeen() {
    const seen = this._state('last_seen');
    if (available(seen)) {
      const ts = Date.parse(seen.state);
      if (Number.isFinite(ts)) return { ts, reliable: true };
    }
    let latest = 0;
    for (const key of Object.keys(ENTITIES)) {
      if (NOT_REPORTS.includes(key)) continue;
      const st = this._state(key);
      if (!available(st)) continue;
      const ts = Date.parse(st.last_reported || st.last_updated || st.last_changed);
      if (ts > latest) latest = ts;
    }
    return latest ? { ts: latest, reliable: false } : undefined;
  }

  _isStale(lastSeen) {
    return Boolean(lastSeen?.reliable) && Date.now() - lastSeen.ts > this._config.stale_after * 60000;
  }

  _duration(ts, short = false) {
    const t = this._t();
    const min = Math.floor((Date.now() - ts) / 60000);
    if (min < 1) return short ? '0m' : t.now;
    if (min < 60) return short ? `${min}m` : `${min} min`;
    const h = Math.floor(min / 60);
    if (h < 48) return short ? `${h}h` : `${h} h`;
    return short ? `${Math.floor(h / 24)}${t.day}` : `${Math.floor(h / 24)} ${t.day}`;
  }

  _status() {
    const t = this._t();
    const smoke = this._state('smoke');
    if (!smoke) return { level: 'unavailable', text: t.not_found, icon: `${ICON}-off`, badge: 'mdi:help' };
    if (smoke.state === 'on') return { level: 'alarm', text: t.smoke, icon: `${ICON}-alert`, badge: 'mdi:fire' };
    if (UNAVAILABLE.includes(smoke.state)) {
      return { level: 'unavailable', text: t.unavailable, icon: `${ICON}-off`, badge: 'mdi:wifi-off' };
    }
    if (this._state('test')?.state === 'on') return { level: 'warning', text: t.test, icon: ICON, badge: 'mdi:test-tube' };
    const fault = this._state('fault');
    if (available(fault) && fault.state !== 'normal') return { level: 'warning', text: t.fault, icon: ICON, badge: 'mdi:alert' };
    const chamber = this._state('contamination');
    if (available(chamber) && chamber.state !== 'normal') {
      return { level: 'warning', text: t.dirty, icon: ICON, badge: 'mdi:broom' };
    }
    if (this._isStale(this._lastSeen())) {
      return { level: 'warning', text: t.stale, icon: ICON, badge: 'mdi:clock-alert-outline' };
    }
    const battery = num(this._state('battery'));
    if (this._state('battery_low')?.state === 'on' || (battery !== undefined && battery < this._config.battery_warning)) {
      return { level: 'warning', text: t.low_battery, icon: ICON, badge: 'mdi:battery-alert' };
    }
    const muted = this._state('muted');
    if (this._state('mute')?.state === 'on' || (available(muted) && muted.state !== 'normal')) {
      return { level: 'ok', text: t.muted, icon: ICON, badge: 'mdi:volume-off' };
    }
    return { level: 'ok', text: t.ok, icon: ICON };
  }

  _batteryColor(v) {
    if (v === undefined) return COLORS.unavailable;
    if (v < this._config.battery_warning) return COLORS.alarm;
    return v < 40 ? COLORS.warning : COLORS.ok;
  }

  // ------------------------------------------------------------- render

  _update() {
    if (!this._hass || !this._config) return;
    this._renderFace();
    if (this._dialog.open) this._renderPanel();
  }

  _setHtml(el, html) {
    if (el._html === html) return;
    el._html = html;
    el.innerHTML = html;
  }

  _statusIcon(status) {
    return `<div class="icon">
        <ha-icon icon="${status.icon}"></ha-icon>
        ${status.badge ? `<span class="badge"><ha-icon icon="${status.badge}"></ha-icon></span>` : ''}
      </div>`;
  }

  _name() {
    return this._config.name ?? this._state('smoke')?.attributes.friendly_name ?? this._config.device;
  }

  _renderFace() {
    const t = this._t();
    const status = this._status();
    const chips = [];

    if (this._state('battery')) {
      const v = num(this._state('battery'));
      chips.push({
        icon: v === undefined ? 'mdi:battery-unknown' : batteryIcon(v),
        text: v === undefined ? '—' : `${Math.round(v)}%`,
        color: this._batteryColor(v),
      });
    }
    if (this._state('temperature')) {
      const v = num(this._state('temperature'));
      chips.push({ icon: 'mdi:thermometer', text: v === undefined ? '—' : `${Math.round(v)}°`, color: COLORS.info });
    }
    const lastSeen = this._lastSeen();
    if (lastSeen !== undefined) {
      chips.push({
        icon: lastSeen.reliable ? 'mdi:clock-outline' : 'mdi:update',
        text: this._duration(lastSeen.ts),
        short: this._duration(lastSeen.ts, true),
        color: this._isStale(lastSeen) ? COLORS.warning : COLORS.muted,
      });
    }

    const mute = this._state('mute');
    const showMute = status.level === 'alarm' && available(mute);

    this._setHtml(
      this._face,
      `<ha-card class="${status.level}" style="--sdc-color: ${COLORS[status.level]}">
        <ha-icon class="kind" icon="${esc(this._config.kind_icon)}" title="${esc(t.kind)}" aria-label="${esc(t.kind)}"></ha-icon>
        <button class="icon-btn more" data-action="open" aria-label="${esc(t.more)}" title="${esc(t.more)}">
          <ha-icon icon="mdi:dots-horizontal"></ha-icon>
        </button>
        <div class="main" role="button" tabindex="0" data-action="open">
          ${this._statusIcon(status)}
          <div class="name">${esc(this._name())}</div>
          <div class="status">${esc(status.text)}</div>
        </div>
        ${showMute
          ? `<button class="alarm-btn" data-action="mute" ${mute.state === 'on' ? 'disabled' : ''}>
              <ha-icon icon="mdi:volume-off"></ha-icon>${esc(mute.state === 'on' ? t.muted_on : t.mute)}
            </button>`
          : ''}
        ${chips.length
          ? `<div class="chips">${chips
              .map((c) => `<span class="chip" style="--chip-color: ${c.color}"><ha-icon icon="${c.icon}"></ha-icon>${
                c.short ? `<span class="long">${esc(c.text)}</span><span class="short">${esc(c.short)}</span>` : esc(c.text)
              }</span>`)
              .join('')}</div>`
          : ''}
      </ha-card>`,
    );
  }

  _row(key, icon, label, value, { sub, color } = {}) {
    return `<li role="button" tabindex="0" data-action="more-info" data-entity="${esc(this._entities[key])}"
        ${color ? `style="--row-color: ${color}"` : ''}>
        <ha-icon icon="${icon}"></ha-icon>
        <span class="label">${esc(label)}</span>
        <span class="value">${esc(value)}${sub ? `<span class="sub">${esc(sub)}</span>` : ''}</span>
      </li>`;
  }

  _renderPanel() {
    const t = this._t();
    const status = this._status();
    const rows = [];
    const value = (key, unit = '') => {
      const st = this._state(key);
      if (!available(st)) return '—';
      if (this._hass.formatEntityState) {
        const formatted = this._hass.formatEntityState(st);
        // Entities without unit_of_measurement come back bare: add the fallback unit.
        return unit && !st.attributes.unit_of_measurement && num(st) !== undefined ? `${formatted}${unit}` : formatted;
      }
      const v = num(st);
      return v === undefined ? st.state : `${v}${unit}`;
    };

    const lastSeen = this._lastSeen();
    if (lastSeen !== undefined) {
      rows.push(
        this._row(
          lastSeen.reliable ? 'last_seen' : 'smoke',
          lastSeen.reliable ? 'mdi:clock-outline' : 'mdi:update',
          lastSeen.reliable ? t.last_seen : t.last_change,
          Date.now() - lastSeen.ts < 60000 ? t.now : fill(t.ago, { t: this._duration(lastSeen.ts) }),
          {
            sub: new Date(lastSeen.ts).toLocaleString(this._hass.locale?.language || undefined, {
              dateStyle: 'short',
              timeStyle: 'short',
            }),
            color: this._isStale(lastSeen) ? COLORS.warning : undefined,
          },
        ),
      );
    }
    if (this._state('battery')) {
      const v = num(this._state('battery'));
      rows.push(
        this._row('battery', v === undefined ? 'mdi:battery-unknown' : batteryIcon(v), t.battery, value('battery', ' %'), {
          color: this._batteryColor(v),
        }),
      );
    }
    if (this._state('temperature')) {
      const unit = this._state('temperature').attributes.unit_of_measurement || '°C';
      rows.push(this._row('temperature', 'mdi:thermometer', t.temperature, value('temperature', ` ${unit}`), { color: COLORS.info }));
    }
    if (this._state('linkquality')) {
      rows.push(this._row('linkquality', 'mdi:signal', t.linkquality, value('linkquality', ' LQI')));
    }
    if (this._state('rejoin_count')) rows.push(this._row('rejoin_count', 'mdi:wifi-refresh', t.rejoins, value('rejoin_count')));
    if (this._state('reboot_count')) rows.push(this._row('reboot_count', 'mdi:restart', t.reboots, value('reboot_count')));
    if (this._state('contamination')) {
      const st = this._state('contamination');
      rows.push(
        this._row('contamination', 'mdi:air-filter', t.chamber, st.state === 'normal' ? t.normal : value('contamination'), {
          color: available(st) && st.state !== 'normal' ? COLORS.warning : undefined,
        }),
      );
    }
    if (this._state('smoke_level')) {
      const unit = this._state('smoke_level').attributes.unit_of_measurement || 'dB/m';
      rows.push(this._row('smoke_level', 'mdi:smoke', t.smoke_level, value('smoke_level', ` ${unit}`)));
    }

    const reachable = available(this._state('smoke'));
    const mute = this._state('mute');
    const actions = [];
    if (mute) {
      const on = mute.state === 'on';
      const ringing = this._state('smoke')?.state === 'on';
      actions.push(`<button class="action" data-action="mute" ${on || !ringing || !available(mute) ? 'disabled' : ''}>
          <ha-icon icon="mdi:volume-off"></ha-icon>${esc(on ? t.muted_on : t.mute)}</button>`);
    }
    if (this._state('identify')) {
      actions.push(`<button class="action" data-action="identify" ${reachable ? '' : 'disabled'}>
          <ha-icon icon="mdi:lightbulb-on-outline"></ha-icon>${esc(t.identify)}</button>`);
    }
    if (this._state('selftest')) {
      actions.push(`<button class="action danger" data-action="selftest" ${reachable ? '' : 'disabled'}>
          <ha-icon icon="mdi:bullhorn-outline"></ha-icon>${esc(t.selftest)}</button>`);
    }

    const actionsHtml = this._confirmSelftest
      ? `<div class="confirm">
          <p><ha-icon icon="mdi:alert"></ha-icon><span>${esc(t.selftest_warning)}</span></p>
          <div class="buttons">
            <button class="btn" data-action="selftest-cancel">${esc(t.cancel)}</button>
            <button class="btn danger" data-action="selftest-confirm">${esc(t.confirm)}</button>
          </div>
        </div>`
      : `<div class="actions">${actions.join('')}</div>`;

    const update = this._state('update');
    const deviceId = this._hass.entities?.[this._entities.smoke]?.device_id;
    const footer = [];
    if (update?.attributes.installed_version) {
      const available_ = update.state === 'on'
        ? ` · <span class="update">${esc(fill(t.update_available, { v: update.attributes.latest_version }))}</span>`
        : '';
      footer.push(`<span>${esc(t.firmware)} ${esc(update.attributes.installed_version)}${available_}</span>`);
    }
    if (deviceId) {
      footer.push(`<button class="link" data-action="device" data-device="${esc(deviceId)}">${esc(t.device)}</button>`);
    }

    this._setHtml(
      this._dialog,
      `<div class="sheet ${status.level}" tabindex="-1" autofocus style="--sdc-color: ${COLORS[status.level]}">
        <header>
          ${this._statusIcon(status)}
          <div class="titles">
            <div class="name">${esc(this._name())}</div>
            <div class="status">${esc(status.text)}</div>
          </div>
          <button class="icon-btn" data-action="close" aria-label="${esc(t.close)}" title="${esc(t.close)}">
            <ha-icon icon="mdi:close"></ha-icon>
          </button>
        </header>
        ${rows.length ? `<section><h3>${esc(t.health)}</h3><ul class="rows">${rows.join('')}</ul></section>` : ''}
        ${actions.length ? `<section><h3>${esc(t.actions)}</h3>${actionsHtml}</section>` : ''}
        ${footer.length ? `<footer>${footer.join('')}</footer>` : ''}
      </div>`,
    );
  }

  // ------------------------------------------------------------ actions

  _onClick(ev) {
    if (ev.target === this._dialog) {
      // Click on the backdrop.
      this._dialog.close();
      return;
    }
    const el = ev.composedPath().find((n) => n.dataset?.action);
    if (!el || el.disabled) return;
    ev.stopPropagation();
    const press = (key) => this._hass.callService('button', 'press', { entity_id: this._entities[key] });

    switch (el.dataset.action) {
      case 'open':
        this._renderPanel();
        this._dialog.showModal();
        break;
      case 'close':
        this._dialog.close();
        break;
      case 'more-info':
        // Our modal sits in the top layer: close it so HA's dialog is visible.
        this._dialog.close();
        this._fire('hass-more-info', { entityId: el.dataset.entity });
        break;
      case 'mute': {
        // Domain taken from the entity (switch by default, input_boolean for tests, etc.).
        const id = this._entities.mute;
        this._hass.callService(id.split('.')[0], 'turn_on', { entity_id: id });
        break;
      }
      case 'identify':
        press('identify');
        break;
      case 'selftest':
        this._confirmSelftest = true;
        this._renderPanel();
        break;
      case 'selftest-cancel':
        this._confirmSelftest = false;
        this._renderPanel();
        break;
      case 'selftest-confirm':
        this._confirmSelftest = false;
        press('selftest');
        this._renderPanel();
        break;
      case 'device':
        this._dialog.close();
        window.history.pushState(null, '', `/config/devices/device/${el.dataset.device}`);
        window.dispatchEvent(new CustomEvent('location-changed', { detail: { replace: false } }));
        break;
      default:
        break;
    }
  }

  _fire(type, detail) {
    this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
  }
}

if (!customElements.get('smoke-detector-card')) {
  customElements.define('smoke-detector-card', SmokeDetectorCard);
  window.customCards = window.customCards || [];
  window.customCards.push({
    type: 'smoke-detector-card',
    name: 'Smoke Detector Card',
    description: 'Alarm status, battery, temperature and link health of a Zigbee smoke detector.',
    preview: true,
    documentationURL: 'https://github.com/m4t1eu/lovelace-smoke-detector-card',
  });
  console.info(
    `%c SMOKE-DETECTOR-CARD %c ${VERSION} `,
    'color: #fff; background: #db4437; font-weight: 700;',
    'color: #db4437; background: #fff;',
  );
}
