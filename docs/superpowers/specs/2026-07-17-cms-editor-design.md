# CMS Editor Design Spec

**Date:** 2026-07-17  
**Status:** Approved  
**Scope:** Full-visual CMS editor with persistent sidebar, versioned file persistence, real-time preview sync

## Overview

Add a persistent CMS editing panel to the Reliance Builder app that allows users to visually edit all content types (AppScreen, Video, Social, Motion, Slide) after AI generation. Edits are saved as timestamped versioned files in the repo with git commit history, allowing content teams to refine designs without regenerating.

### Goals

1. Enable post-generation visual refinement (copy, images, colors, layout/component swaps)
2. Persist edits as versioned JSON files with git history
3. Provide real-time preview sync as users edit
4. Support all content types equally from launch
5. Be accessible throughout the app (persistent sidebar, not a modal or separate route)

---

## Architecture

### State Management

Three layers of state:

1. **App State** (Redux/Zustand/React Context) — persists throughout the session
   - Current step (start/question/result)
   - Generated build plan and refinements
   - Build metadata (category, prompt, answers)

2. **Preview State** — which content type is currently being previewed
   - Active content type ID (e.g., "appscreen-1", "video-2")
   - Reference to the source build plan

3. **CMS Editor State** (local component state or shallow context)
   - Edited field values (form data)
   - Whether sidebar is open
   - Unsaved changes flag
   - Active editor tab (if multi-tab support added later)

**Data flow:**
```
App State → BuildPreview → (determines active content type)
         ↓
    CMS Editor State
         ↓
      Form Inputs ←→ Live Preview (with edits applied)
         ↓
    [Save Version] → JSON file + git commit
```

### File Structure

New directories/files to add:

```
App/src/
├── components/
│   ├── previews/
│   │   └── (existing: AppScreenPreview, VideoPreview, etc.)
│   ├── cms/
│   │   ├── CMSSidebar.tsx          (persistent sidebar container)
│   │   ├── CMSEditor.tsx            (main editor form + save flow)
│   │   ├── editors/
│   │   │   ├── AppScreenEditor.tsx
│   │   │   ├── VideoEditor.tsx
│   │   │   ├── SocialEditor.tsx
│   │   │   ├── MotionEditor.tsx
│   │   │   └── SlideEditor.tsx
│   │   ├── fields/
│   │   │   ├── TextField.tsx
│   │   │   ├── ImageUpload.tsx
│   │   │   ├── ColorPicker.tsx
│   │   │   └── ComponentSelector.tsx
│   │   └── VersionHistory.tsx        (browse saved versions)
│   ├── App.tsx                       (integrate CMSSidebar)
│   └── ResultScreen.tsx              (no change; CMS is independent)
├── types.ts                          (add CMSEditState, VersionMetadata)
├── services/
│   ├── cmsFileService.ts             (write JSON + git commit)
│   └── cmsEditorSchemas.ts           (field definitions per content type)
└── data/
    └── cmsDefaults.ts                (default field values per type)
```

---

## UI & Layout

### Persistent Sidebar

- **Placement:** Fixed left sidebar, 30-40% width (adjustable)
- **Visibility:** Always visible (desktop), collapsible on mobile (hamburger toggle)
- **Content:**
  - Header: "CMS Editor" + close/collapse icon
  - Content type badge (e.g., "Editing: App Screen")
  - Scrollable form fields
  - Footer: [Save Version] [Discard] buttons

### Form Structure

For each content type, render a vertical form with fields specific to that type:

```
[CMS Editor]
├─ Content Type: App Screen
├─ ─────────────────────────
├─ Headline
│  [Text Input] ← currently: "Power On Your Future"
├─ Body Copy
│  [Text Area] ← currently: "Reliance Energy..."
├─ Button Text
│  [Text Input]
├─ Button Action
│  [Dropdown: Navigate/Submit/Modal/etc]
├─ Hero Image
│  [Image Upload] (drag/drop or picker)
│  ├─ Preview: [thumbnail]
│  └─ Alt Text: [text input]
├─ Background Color
│  [Color Picker w/ brand tokens]
│  └─ [#1a2640] + Reliance preset
├─ Text Color
│  [Color Picker]
├─ Layout Variant
│  [Dropdown: Left/Center/Right/Split]
├─ ─────────────────────────
├─ [Save Version] [Discard]
└─ Version History ↓
```

### Live Preview Sync

The preview component (right side, existing BuildPreview) receives edits as props:

```tsx
<BuildPreview
  category={category.id}
  answers={answers}
  plan={plan}
  cmsEdits={cmsEditorState.edits}  // ← new prop
  previewMode="with-edits"          // ← optional mode
/>
```

The preview renderer applies edits on top of the original plan before render (e.g., swap headline text, use edited color, load uploaded image).

---

## Editable Fields by Content Type

### AppScreen

| Field | Type | Validation | Constraint |
|-------|------|-----------|-----------|
| Headline | Text (80 chars) | Required, max 80 | OneUI Text with max 2 lines |
| Body Copy | Text (500 chars) | Optional, max 500 | OneUI Text |
| Button Text | Text (30 chars) | Optional, max 30 | OneUI Button label |
| Button Action | Dropdown | Required if button present | Navigate/Submit/Modal/Custom |
| Hero Image | URL or upload | Must be valid image URL | HTTPS only |
| Hero Image Alt Text | Text (120 chars) | Optional | Accessibility |
| Background Color | Hex or token | Must be valid hex or Reliance token | OneUI Surface background |
| Text Color | Hex or token | Must be valid hex or Reliance token | OneUI Text color |
| Layout Variant | Dropdown | Required | Left/Center/Right/Split/Grid |

### Video

| Field | Type | Validation |
|-------|------|-----------|
| Title | Text (60 chars) | Required |
| Subtitle | Text (120 chars) | Optional |
| Voiceover Script | Text (2000 chars) | Optional |
| Background Music Track | Dropdown or URL | Optional; must be Higgsfield-compatible |
| Scene Descriptions | Text (500 chars per scene) | Optional |
| Duration | Number (seconds) | Optional; 1-600s |
| Opening/Closing Color | Hex or token | Optional |

### Social Card

| Field | Type | Validation |
|-------|------|-----------|
| Headline | Text (60 chars) | Required |
| Caption | Text (240 chars) | Optional |
| Image/Hero | URL or upload | Required |
| CTA Text | Text (30 chars) | Optional |
| Platform | Dropdown | Instagram/LinkedIn/Twitter/etc |
| Brand Color Accent | Hex or token | Optional |
| Hashtags | Text (comma-separated) | Optional |

### Motion

| Field | Type | Validation |
|-------|------|-----------|
| Animation Timing | Number (ms) | 300-3000ms |
| Text Overlay | Text (100 chars) | Optional |
| Color Palette | Multiple Hex/tokens | Optional |
| Speed/Easing | Dropdown | ease-in/ease-out/linear/etc |

### Slide

| Field | Type | Validation |
|-------|------|-----------|
| Title | Text (80 chars) | Required |
| Bullet Points | List of Text | Max 5, each 120 chars |
| Background Image | URL or upload | Optional |
| Speaker Notes | Text (1000 chars) | Optional |
| Transition Effect | Dropdown | Fade/Slide/Zoom/None |

---

## File Persistence & Versioning

### Save Flow

1. User clicks [Save Version]
2. Modal/prompt appears: "Describe this version" (text input, required)
3. User enters label (e.g., "Hero section – color refinement")
4. Click [Save]
5. System:
   - Serializes edited fields to JSON
   - Writes to `builds/[ISO-timestamp]-[slug].json`
   - Creates git commit: `"Edit: [label]"`
   - Shows toast success: "Version saved. [View Git Commit]"

### File Format

```json
{
  "metadata": {
    "buildId": "uuid-from-original-build",
    "contentType": "appscreen",
    "label": "Hero section – color refinement",
    "timestamp": "2026-07-17T14:30:22.123Z",
    "author": "user@example.com",
    "git": {
      "commit": "a1b2c3d4...",
      "branch": "main"
    }
  },
  "edits": {
    "headline": "Power On Your Future",
    "bodyText": "Harness Reliance Energy.",
    "buttonText": "Get Started",
    "buttonAction": "navigate",
    "imageUrl": "https://cdn.jio.com/...",
    "backgroundColor": "#1a2640",
    "textColor": "#ffffff",
    "layoutVariant": "split"
  },
  "original": {
    "plan": { ...full AI-generated plan, unedited... },
    "refinements": [ ...text refinements user made... ]
  }
}
```

**File location:** `builds/2026-07-17T143022-hero-color-refinement.json`  
**Git commit message:** `"Edit: Hero section – color refinement"`

### Version History

Optional: Side panel or dropdown in CMS sidebar showing past saved versions:
- Lists all `.json` files in `builds/` matching current build ID
- Each row: timestamp, label, git link
- Click to load and view or switch to that version (with confirmation)

---

## Component Lifecycle

### CMSSidebar (Persistent Container)

```tsx
export function CMSSidebar({
  isOpen: boolean;
  onToggle: () => void;
  buildRequest: BuildRequest;
  activeContentType: string;
  onSave: (label: string, edits: CmsEdits) => Promise<void>;
}) {
  return (
    <aside className="cms-sidebar">
      <CMSEditor
        contentType={activeContentType}
        buildRequest={buildRequest}
        onSave={onSave}
      />
    </aside>
  );
}
```

### CMSEditor (Form + State)

```tsx
export function CMSEditor({
  contentType: string;
  buildRequest: BuildRequest;
  onSave: (label: string, edits: CmsEdits) => Promise<void>;
}) {
  const [edits, setEdits] = useState<CmsEdits>({});
  const [isSaving, setIsSaving] = useState(false);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  
  // Render the appropriate editor component based on contentType
  // e.g., <AppScreenEditor edits={edits} onChange={setEdits} />
}
```

### Preview Integration

In `BuildPreview.tsx`, accept optional edits:

```tsx
export function BuildPreview({
  category: BuildCategoryId;
  answers: GuidedAnswers;
  plan: BuildPlan;
  cmsEdits?: CmsEdits;  // ← new optional prop
}) {
  // Apply cmsEdits on top of plan before rendering
  const renderData = cmsEdits ? applyEditsToRender(plan, cmsEdits) : plan;
  
  return (
    // Render using renderData, which includes edited values
  );
}
```

---

## Error Handling & Edge Cases

| Scenario | Behavior |
|----------|----------|
| **Image upload fails** | Show toast error; keep field empty; offer retry |
| **Git commit fails** | Show modal with error; offer "Retry" or "Discard Changes" |
| **User navigates away with unsaved edits** | Show confirmation dialog |
| **Content type changes while editing** | Save current editor state to temp storage; load new type's editor |
| **Invalid color hex** | Highlight field red; show "Enter valid hex code" error |
| **File write permission denied** | Toast: "Cannot save. Check file permissions." |
| **Save label is empty** | Disable [Save] button until label is entered |

---

## Testing Strategy

### Unit Tests

- **Form validation:** text length, color format, required fields
- **Edit serialization:** cmsEdits object → JSON payload
- **Field components:** TextField, ColorPicker, ImageUpload render correctly and fire onChange

### Integration Tests

- **Edit → Preview sync:** change headline in form → headline updates in preview
- **Save flow:** fill form → click Save → file written → git commit created
- **Switching content types:** switch from AppScreen to Video → AppScreenEditor state persists, VideoEditor loads

### E2E Tests

- **Full workflow:** generate build → open editor → edit multiple fields → preview updates → save version → verify file in repo → verify git log
- **Unsaved changes:** make edits → navigate away → confirmation appears
- **Version history:** save multiple versions → browse history → load old version

---

## Performance Considerations

- **Form re-renders:** use React.memo on individual field components to avoid re-rendering on every edit
- **Preview re-renders:** debounce preview updates (e.g., 200ms) to avoid DOM thrashing during rapid typing
- **Image uploads:** compress/resize on client before POST (if using a server); show upload progress

---

## Success Criteria

- ✓ Users can edit all editable fields for each content type without regenerating
- ✓ Preview updates in real-time as form fields change
- ✓ Edits persist as timestamped JSON files in `builds/` with git commit history
- ✓ Users can describe each save (required label)
- ✓ Sidebar is always visible and never blocks preview (responsive on mobile)
- ✓ Users receive visual feedback on unsaved changes and errors
- ✓ All content types (AppScreen, Video, Social, Motion, Slide) are supported at launch

---

## Rollout Plan

**Phase 1:** Core architecture (sidebar, editor state, one content type — AppScreen)  
**Phase 2:** Add remaining content types (Video, Social, Motion, Slide)  
**Phase 3:** Version history browser + nice-to-haves (undo/redo, batch edits)

---

## Related Docs

- `docs/reference/Reliance_Photography_Art_Director_V4.md` — brand guidelines for image refinements
- `.claude/CLAUDE.md` — project config (no MCP tools; .env workflow; file organization rules)
