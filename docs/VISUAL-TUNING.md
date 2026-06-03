# Pulir el visual del Starship

## Archivo principal de forma

[`src/visuals/starshipGeometry.ts`](../src/visuals/starshipGeometry.ts) — objeto `SHIP`:

| Constante | Efecto |
|-----------|--------|
| `bodyRadius` | Grosor del fuselaje |
| `coneHeight` | Altura del cono nasal |
| `bodyHeight` | Largo del cilindro |
| `finHeight` / `finSpan` | Tamaño de las grid fins |
| `engineRadius` | Campanas Raptor |
| `skirtHeight` | Falda inferior antes de motores |

## Archivo de escena

[`src/visuals/scene.ts`](../src/visuals/scene.ts) — cielo gradiente, sol, grid en perspectiva, cámara.

## Capas del cohete

- **hull** — líneas cian/magenta según graves
- **glow** — halo additive (brillo synthwave)
- **plume** — llamas naranja/magenta, escalan con graves

## Checklist rápido

Ver [`STarship-checklist.md`](STarship-checklist.md) en la app (`npm run dev`).