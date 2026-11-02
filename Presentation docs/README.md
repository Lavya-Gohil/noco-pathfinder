# Presentation docs

Everything prepared for the four-minute presentation of NOCO Asset IQ to NOCO.

| File | What it is |
|---|---|
| [`NOCO-Asset-IQ.pptx`](NOCO-Asset-IQ.pptx) | The deck: 10 slides with Morph transitions and a timed script in the speaker notes, plus a hidden backup slide (11) |
| [`NOCO-Asset-IQ-Presentation-Script.docx`](NOCO-Asset-IQ-Presentation-Script.docx) | What to say and do on each slide, with times, speakers and what to do if something goes wrong |
| [`NOCO-Asset-IQ-Master-Briefing.pdf`](NOCO-Asset-IQ-Master-Briefing.pdf) | The full briefing: the product, the numbers, the demo script, hard questions and the backup plan |
| [`report-sample.pdf`](report-sample.pdf) | The executive report the app produces for the sample building |
| [`screenshots/`](screenshots/) | The key screens in demo order |
| [`site/`](site/) | A built copy of the app, for running the demo without internet |
| [`README.txt`](README.txt) | How to use the offline demo |
| [`deck-source/`](deck-source/) | The scripts and image used to generate the first version of the deck |

## Notes

- **The PDF is a snapshot.** The live briefing is at <https://claude.ai/artifact/6qsbB1PDYCLhBQrctJceRw>, and the PDF leaves out nothing except later edits.
- **The offline demo needs a local server.** Opening `site/index.html` directly won't work, so follow `README.txt`. `site/` matches the app as of commit `b39ccd1`.
- **Edit the deck in PowerPoint, not through `deck-source/`.** Regenerating would overwrite changes made since, and the scripts have paths from the machine they were written on.
- **All figures are illustrative pre-audit estimates** on a fictional sample building. See [`docs/assumptions.md`](../docs/assumptions.md) for their sources.
