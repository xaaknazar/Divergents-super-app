# Map glass hierarchy — 2026-11-08

Map controls no longer share one undifferentiated material. City uses navy glass with white text; search uses light glass with dark ink; selected category and Add Place use blue glass. Other categories adapt to light/dark appearance. Location and moderation have light glass and navy symbols. The map and tab bar retain their existing behaviour.

`MapGlassMaterial` owns native Liquid Glass, blur fallback and opaque Reduce Transparency materials, exposed through semantic roles only. `MapActionButton` owns action geometry and badge. All existing navigation, location, long-press map reload, offline-map and moderation callbacks are retained. SearchField adds the map surface without changing learning search. Stories cover new materials/actions and map chips.

Validation:
- TypeScript: passed.
- MapSearchHeader and ChipRail: 18 tests passed (search, focus, clear, city/profile actions, layout, Reduce Transparency contrast).
- iOS 26.5 simulator: isolated native map preview, both appearances, category selection; native glass transmits map content. Increased final navy/blue tint and search ink contrast after visual inspection.
- No physical iPhone, production data, backend or TestFlight changes.

Preview files (isolated fixtures, not application data): `/private/tmp/divergents-map-dark.png`, `/private/tmp/divergents-map-light.png`. Captured before the final contrast adjustment. Preview entry restored and fixture removed from the application source.
