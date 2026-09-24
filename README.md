# Smoke Detector Card

[![hacs_badge](https://img.shields.io/badge/HACS-Custom-41BDF5.svg)](https://hacs.xyz)
[![Validate](https://github.com/m4t1eu/lovelace-smoke-detector-card/actions/workflows/validate.yml/badge.svg)](https://github.com/m4t1eu/lovelace-smoke-detector-card/actions/workflows/validate.yml)

Compact Lovelace card for Zigbee smoke detectors (e.g. Heiman): alarm status, battery,
temperature and link health at a glance. Built for Zigbee2MQTT, theme-aware, no dependencies.

<p align="center">
  <img src="https://raw.githubusercontent.com/m4t1eu/lovelace-smoke-detector-card/main/docs/cards.png" alt="Three smoke detector cards" width="600">
</p>
<p align="center">
  <img src="https://raw.githubusercontent.com/m4t1eu/lovelace-smoke-detector-card/main/docs/alarm.png" alt="Alarm state" width="200">
  <img src="https://raw.githubusercontent.com/m4t1eu/lovelace-smoke-detector-card/main/docs/low-battery.png" alt="Low battery warning" width="200">
  <img src="https://raw.githubusercontent.com/m4t1eu/lovelace-smoke-detector-card/main/docs/panel.png" alt="Details panel on a phone" width="260">
</p>

## Features

- **Card face**: large status icon, name, short status, and chips for battery, temperature and last report.
  Chips switch to a compact layout when the card is narrow (container query).
- **Details panel** (tap the card or `⋯`): last seen, battery, temperature, link quality, rejoin count, reboots, detection chamber state, smoke level, firmware version and a link to the device page.
- **Actions**: mute, identify (blinks the LED) and self-test — with an explicit confirmation, since it sounds the siren.
- **Mute button on the card face** while the alarm is ringing.
- Status priority: **Smoke** › **Unavailable** › **Testing** › **Fault** › **Dirty chamber** › **No report** ›
  **Low battery** › **Muted** › **OK**.
- Pulsing red icon and card border when smoke is detected (respects `prefers-reduced-motion`).
- Theme-aware (`--error-color`, `--warning-color`, `--success-color`…), English and French labels.
- Works in sections views (`grid_options` supported). The panel is a native `<dialog>` (bottom sheet on phones).

## Installation

### HACS (custom repository)

1. HACS → ⋮ → **Custom repositories**.
2. Repository: `https://github.com/m4t1eu/lovelace-smoke-detector-card`, type **Dashboard**.
3. Download **Smoke Detector Card**, then reload your browser (clear cache if needed).

No Home Assistant restart is required.

### Manual

1. Download `smoke-detector-card.js` from the latest release into `config/www/`.
2. Add a dashboard resource: `/local/smoke-detector-card.js`, type **JavaScript module**.

## Configuration

```yaml
type: custom:smoke-detector-card
device: 0xa459bffffeaf56eb
name: Staircase
```

| Option            | Type   | Default                    | Description |
|-------------------|--------|----------------------------|-------------|
| `device`          | string | —                          | Zigbee2MQTT entity prefix (the part between the domain and the property, e.g. `0xa459bffffeaf56eb`). Required unless `entities.smoke` is set. |
| `name`            | string | friendly name of the smoke entity | Card title. |
| `entities`        | map    | derived from `device`      | Override any entity (see below). |
| `battery_warning` | number | `20`                       | Battery % below which the card shows *Low battery*. |
| `kind_icon`       | string | `mdi:fire`                 | Small icon in the top-left corner telling what kind of detector this is. |
| `stale_after`     | number | `180`                      | Minutes without any report before the card shows *No report* (requires `last_seen`). |

### Entities

With `device: <prefix>`, the card looks for the entities Zigbee2MQTT creates by default:

| Key            | Derived entity                        |
|----------------|---------------------------------------|
| `smoke`        | `binary_sensor.<prefix>_smoke`        |
| `battery`      | `sensor.<prefix>_battery`             |
| `battery_low`  | `binary_sensor.<prefix>_battery_low`  |
| `temperature`  | `sensor.<prefix>_temperature`         |
| `fault`        | `sensor.<prefix>_fault_state`         |
| `test`         | `binary_sensor.<prefix>_test`         |
| `contamination`| `sensor.<prefix>_chamber_contamination` |
| `muted`        | `sensor.<prefix>_muted`               |
| `mute`         | `switch.<prefix>_temporary_mute`      |
| `smoke_level`  | `sensor.<prefix>_smoke_level`         |
| `linkquality`  | `sensor.<prefix>_linkquality` (disabled by default in HA — enable it to show LQI) |
| `rejoin_count` | `sensor.<prefix>_rejoin_count`        |
| `reboot_count` | `sensor.<prefix>_reboot_count`        |
| `selftest`     | `button.<prefix>_trigger_selftest`    |
| `identify`     | `button.<prefix>_identify`            |
| `update`       | `update.<prefix>`                     |
| `last_seen`    | `sensor.<prefix>_last_seen` (see below) |

### Last seen

The Home Assistant frontend only knows when a value last **changed**, not when the device last **reported**.
A detector sitting at a stable temperature can look silent for hours while being perfectly fine.

For a reliable *Last seen* and the *No report* warning, enable Zigbee2MQTT's `last_seen` option
(Settings → Advanced → Last seen: `ISO_8601`) and enable the `sensor.<prefix>_last_seen` entity in Home Assistant.
Without it, the card shows *Last change* instead and never raises *No report*.

Missing entities are simply skipped. For ZHA or other integrations, map them explicitly:

```yaml
type: custom:smoke-detector-card
name: Kitchen
entities:
  smoke: binary_sensor.kitchen_smoke_alarm
  battery: sensor.kitchen_smoke_battery
  temperature: sensor.kitchen_smoke_temperature
```

### Layout example (3 detectors in a row)

```yaml
type: grid
columns: 3
square: false
cards:
  - type: custom:smoke-detector-card
    device: 0xa459bffffeaf56eb
    name: Staircase
  - type: custom:smoke-detector-card
    device: 0x5c3aa2fffec694a7
    name: Bedroom
  - type: custom:smoke-detector-card
    device: 0xa459bffffeaf6a29
    name: Laundry
```

## Development

Single-file vanilla web component, no build step.

- `node --check smoke-detector-card.js` for a quick syntax check.
- Releases: push a `vX.Y.Z` tag; the workflow stamps the version and attaches
  `smoke-detector-card.js` to the GitHub release, which HACS downloads.

## License

MIT
