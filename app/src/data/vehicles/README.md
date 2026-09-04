# Comparison vehicles

One JSON file per make, validated against `vehicle-make.schema.json` and
loaded automatically. Figures must come from an official test database and
the file must say which one and when it was read. `volvo.json` was pulled
from the US EPA fueleconomy.gov web service by vehicle id; the derivation of
L/100 km and CO₂ is written in the file. The guide, including how to pull
another make, is [`docs/VEHICLE_DATA.md`](../../../../docs/VEHICLE_DATA.md).
