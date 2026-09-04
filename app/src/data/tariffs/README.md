# Tariff presets

One JSON file per electricity provider (or a generic region), validated
against `tariff-provider.schema.json` and picked up automatically by the
app. To add your provider, copy `hydro-ottawa.json`, edit, run `make test`,
and open a pull request. The full guide, including what every field means
and how seasons work, is in [`docs/TARIFF_PRESETS.md`](../../../../docs/TARIFF_PRESETS.md).
