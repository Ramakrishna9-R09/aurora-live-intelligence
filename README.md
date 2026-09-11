# Aurora - Performance-critical data visualization dashboard

Aurora is a premium, single-page interpretation of the **Performance-Critical Data Visualization Dashboard** option in the frontend R&D brief. It deliberately avoids frameworks and external chart packages, using responsive HTML, CSS, SVG, and vanilla JavaScript instead.

## The experience

- A high-contrast, live operations dashboard with a distinctive aurora-green visual language.
- Fully rendered SVG area and sparkline charts - no canvas blur or third-party bundles.
- An interactive signal map, live activity feed, health rhythm module, command palette, inspector, refresh states, and pause/resume stream.
- Responsive layouts for desktop and mobile.
- Keyboard support: `Ctrl/Cmd + K` opens search, `Space` pauses/resumes live updates, and `Esc` closes the inspector.

## Run it

Open `index.html` directly in a modern browser, or serve the folder using any static file server. It has no build step and no runtime dependencies.
