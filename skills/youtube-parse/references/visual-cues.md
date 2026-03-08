# Frame Extraction Principles

## Core Question

When does visual information provide value beyond textual transcription?

## Information Compression Analysis

Visual content merits extraction when it achieves higher information density than equivalent text description.

**High-value visuals**:

- Spatial relationships (architecture diagrams, system topologies)
- Multi-dimensional data (charts with 3+ variables, heatmaps)
- Symbolic notation (mathematical proofs, chemical structures)
- State transitions (UI flows, before/after comparisons)

**Low-value visuals**:

- Talking head shots with no on-screen content
- Static backgrounds or slides with only text
- Repetitive demonstrations of the same concept

## Signal Detection

Analyze subtitle discourse for:

1. **Deictic references**: Speaker pointing to visual elements ("this", "here", "as you can see")
2. **Parallel channels**: Simultaneous visual and verbal explanation indicating complementary information
3. **Annotation signals**: Speaker describing on-screen markup, highlights, or callouts
4. **Descriptive density**: Complex descriptions suggesting visual would clarify faster than text

## Reader Mental Model

Extract frames that allow readers to:

- Build accurate mental models of abstract systems
- Verify understanding against concrete examples
- Skip lengthy textual descriptions of visual patterns

Avoid frames that:

- Duplicate information already clear from text
- Show transient states without lasting relevance
- Require motion to convey meaning (better suited for video)

## Extraction Economy

Target 5-15 frames per video. Each frame should justify its inclusion by answering:

- What unique information does this add?
- Can this be adequately described in 1-2 sentences? (If yes, skip)
- Will readers reference this multiple times?

Prefer fewer high-impact frames over comprehensive visual documentation.

---

## Practical Guidelines

### Keyword Triggers in Subtitles

**High-priority keywords** (extract frame):

- Demonstratives: "this is", "here you can see", "let me show you", "look at"
- Action cues: "demo", "example", "interface", "workflow", "screen", "click here"
- Comparisons: "before and after", "versus", "compare", "difference"
- Sequences: "step 1/2/3", "first", "then", "next", "finally"

**Medium-priority keywords**:

- Tools: "tool", "platform", "app", "software", "dashboard"
- Processes: "process", "pipeline", "flow", "architecture"
- Results: "result", "output", "generated", "produced"

**Skip keywords**:

- Filler: "um", "uh", "so", "you know", "basically"
- Meta: "introduction", "conclusion", "summary", "recap"

### Video Type Strategies

**Technical Demos/Tutorials**:

- Target: UI screenshots, code snippets, architecture diagrams
- Avoid: Talking heads, transitions
- Cadence: 1 frame per tool/interface shown, 1 frame per operation step

**Interviews/Podcasts**:

- Target: Screen shares, case studies, data visualizations
- Avoid: Speaker close-ups (unless celebrity/authority figure)
- Cadence: Only when visual aids appear

**Educational Lectures**:

- Target: Concept diagrams, formulas, slide key points
- Avoid: Redundant bullet-point slides
- Cadence: 1 frame per major concept introduction

**Product Reviews**:

- Target: Product features, UI walkthroughs, comparison charts
- Avoid: Unboxing shots, reviewer reactions
- Cadence: 1 frame per unique feature/angle shown

### Frame Quantity Guidelines

**By video duration**:

- 5 min → 8-12 frames
- 15 min → 12-20 frames
- 30 min → 20-30 frames
- 60 min → 30-40 frames
- 90+ min → 40-50 frames (diminishing returns beyond this)

**By content density**:

- High density (fast-paced tutorial): +50% more frames
- Low density (interview/discussion): -30% fewer frames

### Quality Filters

**Visual readability checklist**:

- ✅ Text on screen is legible (UI labels, code, slides)
- ✅ Frame is stable (not mid-transition, no motion blur)
- ✅ Information is complete (not cropped/partially visible)
- ✅ Sufficient contrast (not washed out or too dark)

**Content uniqueness check**:

- ❌ Frame duplicates information from previous frame
- ❌ Frame shows same interface state as nearby timestamp
- ❌ Multiple frames of speaker saying same thing with slight head movement

### Contextual Selection

Extract frames when subtitle context indicates:

- **Spatial explanation**: "on the left", "top right corner", "underneath"
- **Visual demonstration**: "as you can see here", "notice how", "watch what happens"
- **Comparative analysis**: "compared to", "instead of", "notice the difference"
- **Complex description**: Multiple sentences describing a single visual element

Skip frames when subtitle context indicates:

- **Pure narration**: No reference to visuals
- **Recap/summary**: Restating previously shown information
- **Transitional phrases**: "moving on to", "next we'll discuss"
