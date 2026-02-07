# Studio Pages — Agent Guide

## Structure
All pages in this directory share `style.css` for consistent styling.

**To change the look of ALL studio pages:** edit `style.css` (CSS variables in `:root`).  
**To add a new page:** create an HTML file, add `<link rel="stylesheet" href="style.css">` in the `<head>`, use the same class names.

## Pages
| File | Content |
|------|---------|
| `index.html` | Hub page — links to all sections, current state summary |
| `inspirations.html` | Artist research with visual tributes (has page-specific tribute CSS) |
| `design-language.html` | Committed design decisions and open questions |
| `explorations.html` | All 19 sketches, categorized as poems/studies/demos |
| `visual-review.html` | Screenshot critique results and rankings |
| `style.css` | **SHARED** — edit this to restyle everything |

## Key Classes
- `.section-card` — clickable card linking to a sub-page
- `.piece` / `.piece.poem` — exploration entry with title + description
- `.artist` — artist card with visual tribute grid
- `.tribute` — 120×120 visual element
- `.committed` / `.open` — design decision blocks
- `.nav` / `.nav-bottom` — navigation links

## Deploy
```bash
cd /data/workspace && bash skills/site-publish/scripts/publish.sh "message"
```
