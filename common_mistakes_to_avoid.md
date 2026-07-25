# Common Mistakes to Avoid & Web Development Checklist

This checklist is a reusable design & development standard to prevent recurring UI/UX, mobile responsiveness, modal behavior, and event-handling bugs across web applications.

---

## 1. Floating Action Buttons (FAB) & Mobile Viewport Overlaps

- [ ] **Restrict Scope of Floating Buttons**:
  - Never render a persistent `fixed` floating action button (e.g., Feedback, Support, Chat) on screens with primary action buttons at the bottom (e.g., submit forms, add content, gameplay controls).
  - Explicitly restrict FAB rendering to non-interactive or summary screens (e.g., `Home` screen and `Scoreboard` page only).

- [ ] **Hide Floating UI when Modals / Drawers are Open**:
  - Check active modal state (`!isModalOpen`) before rendering fixed floating elements to avoid z-index collisions or accidental taps on mobile touch devices.

- [ ] **Mobile Bottom Margin Safety**:
  - Ensure floating buttons maintain adequate padding/offset (`bottom: 24px`, `right: 20px`) and scale down gracefully on screens under `640px`.

---

## 2. Modal Backdrops & Body Scroll Locking

- [ ] **Lock Body Scroll on Mount**:
  - Whenever a modal, full-screen dialog, or slide-over drawer mounts, set `document.body.style.overflow = 'hidden'`.
  - Always clean up in `useEffect` unmount by resetting `document.body.style.overflow = 'unset'` or `''`.

- [ ] **Modal Outer Click & Touch Dismissal**:
  - Ensure modal overlay handles target verification (`e.target === e.currentTarget`) so clicking the dark backdrop closes the modal without dismissing when interacting with internal scrollable form fields.

---

## 3. Device & Browser History (Back-Button) Navigation

- [ ] **Full App Exit vs Ongoing Game Exit Destinations**:
  - **Ongoing Game Exit**: Exiting from an active/ongoing game should navigate to the `Scoreboard` screen so current progress and scores up to that round are recorded and displayed.
  - **Full App Exit (Home Screen)**: Do not intercept the device back button with confirmation popups on the Home Screen. When on `home`, allow the `popstate` / back-button event to pass through naturally without `pushState` so the device or browser exits back to the home launcher or prior page instantly.


---

## 4. Mobile Responsiveness & Button Truncation

- [ ] **Wrap Header & Action Rows on Small Screens**:
  - Avoid `flex items-center justify-between` on header rows containing logos, titles, and multiple action buttons without `flex-wrap` or responsive flex direction (`flex-col sm:flex-row`).
  - On viewports < 480px, non-wrapping rows cause action buttons (e.g., "Sign Out", "Add Content") to get cut off on the right screen edge.

- [ ] **Filter Button Containers**:
  - Use `flex-wrap` or `overflow-x-auto scrollbar-none` for horizontal button groups (e.g., category tabs, filter chips) so all options remain accessible on small phones.

- [ ] **Touch Target Sizing**:
  - Minimum touch target size for mobile buttons should be `44px x 44px` with sufficient gap (`gap-2` or `gap-3`) to prevent mis-taps.

---

## 5. Media Loading States & Fallback Spinners

- [ ] **Explicit Image Loading Indicators**:
  - Never display raw blank image elements while network assets load.
  - Wrap image elements in a loading container with an animated game-themed spinner/skeleton until `onLoad` fires.
  - Provide fallback UI or error state handling on `onError`.

---

## 6. Autocomplete & Dropdown Menus in Forms

- [ ] **Dropdown Layering & Position**:
  - Render form autocomplete suggestions with high z-index (`z-50`) directly positioned under the target text input (`relative` container).
  - Filter suggestions dynamically based on user input (case-insensitive substring match).

- [ ] **Single Unified Input for Category / Folder Selection**:
  - Prefer a single text input with autocomplete suggestions over confusing dual UI (e.g., separate select dropdown + "NEW" text input button).
  - If user selects a suggestion or types an existing name, reuse the existing entity without creating duplicates.

- [ ] **Keyboard & Click Interaction**:
  - Allow selecting suggestions via touch/click (`onMouseDown` or `onClick`).
  - Close suggestion menu on `blur` or when item selected.

---

## 7. Streamlined Single-Page Interaction Loops

- [ ] **Avoid Unnecessary Screen Transitions**:
  - Keep tightly coupled steps (e.g., Question -> Answer Reveal -> Host Scoring) on the same page using state-driven reveals (masked/uncovered cards) rather than forcing full multi-screen context switches.
  - Reduce visual friction for quick party games or host-driven applications.

---

## 8. Viewport Ergonomics & Side-by-Side Gameplay Layouts

- [ ] **Eliminate Vertical Scroll Fatigue in Live Game Loops**:
  - In active gameplay views with live interaction (e.g., Question -> Answer Reveal -> Host Scoring / Player Selection), avoid stacking the question, answer card, and player buttons in a single vertical column.
  - Stacking vertically forces hosts/users to scroll down to reveal answers and select players.
  - Use responsive side-by-side grid layouts (`grid-cols-1 lg:grid-cols-12`):
    - Left column (`lg:col-span-7`): Question text, media, options.
    - Right column (`lg:col-span-5`): Answer card (covered/uncovered), player selection buttons, live scores.
  - Keep covered answer states minimal (e.g. just a clean lock icon 🔒 and Reveal button) without verbose instruction paragraphs.
