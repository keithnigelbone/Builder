/**
 * Condensed Reliance visual-language guidance for Claude-authored image
 * prompts, adapted from Conversation/ART_DIRECTION_RELIANCE_v4.md. Appended
 * to the system prompt only for the `plan` call (see App/aiServerPlugin.ts) —
 * classify never authors image-prompt fields.
 */
export const RELIANCE_ART_DIRECTION = `
Image direction: Grounded Confidence. Every generated image expresses at least one of
three lenses — ideally all three: Authority & Respect (sharp geometric framing, precise
directional light, the subject has presence and mass); Scalability & Growth (the
environment implies scale beyond the frame — a worker against a vast solar field, a
single car that implies a city — the subject is never isolated); Care (hands doing
something real, location made specific, nothing decorative).

Apply the 7 principles: show people operating with real consequence (We Care); show the
moment value is delivered, visible not implied (Customer Value); sharp and considered,
never generic (Excellence); no hierarchy when multiple people appear (One Team); the
individual's work connects to something larger, the person is never small (Ownership
Mindset); every subject shot with the same precision regardless of role — eye level or
slight low angle, never looking down (Respect); never staged, never stock, real skin
tones and real light (Integrity).

Three rules that never break: (1) light always has a direction — sun low, one side,
long rich shadows, nothing flat; (2) the subject is bright with shadow detail
preserved — never crushed to black, never overexposed; (3) bokeh background depth with
intimate push-in framing — something soft anchors the foreground, the background
separates but does not disappear.

Framing: for people, medium close-up with a slight low angle, both hands doing
something specific (operating, tending, turning, connecting — never resting), subject
offset in frame, a soft out-of-focus foreground element. For machines/infrastructure/
aerials, true top-down or wide low angle (never tilted), wide enough to show scale,
light still rakes from one side even from above. Never: subject smiling at camera
unless explicitly asked, centred symmetrical composition, tilted aerial, empty
foreground with no anchor.

Location must be named with physical, specific detail (e.g. "red-brown Rajasthan
earth, dry scrubland, neem trees" — never "in India" or "typical Indian setting", which
produce nothing usable). Never write "hundreds" or "thousands" in an aerial shot — name
a real number or describe infrastructure extending to the horizon.

Never use: "dramatic lighting", "beautiful", "professional photography", "realistic",
"stunning", "perfect", "amazing", "high quality", "photorealistic" alone, "in India",
"Indian setting", "typical".

Absolute rule, no exceptions: never reference, name, imply, or visually include
anything associated with TATA Group — not the name, not a wordmark, not a
TATA-branded vehicle or product, not any logo or colour mark associated with TATA
Motors, TATA Power, TATA Steel, TCS, Jaguar Land Rover, or any TATA subsidiary.
Describe all vehicles/products/infrastructure generically: "white electric car", not a
brand name; "passenger vehicle", not a marque; "steel structure", not a manufacturer.

Author imageSubject (physical description + clothing), imageAction (both hands doing
something specific), imageLocation (named Indian place with physical detail), and
imageFraming (shot type and angle) as separate fields — do not include the visual
baseline in any of them, it is appended separately. Set imageIsAerial true only for a
genuine top-down/aerial shot, and when true, set imageColourNotes to the scene's
specific colours (e.g. "steel-blue panels and red-brown earth").
`.trim();

export const RELIANCE_VISUAL_BASELINE =
  'eye level shot, warm golden directional light, bright on subject with rich shadow ' +
  'detail preserved, high colour saturation, bokeh background depth, intimate push-in ' +
  'framing, mid-to-high brightness, authentic Indian skin tones, vivid festive or ' +
  'natural colours, no artificial fill, cinematic documentary feel';

export const RELIANCE_VISUAL_BASELINE_AERIAL =
  'true top-down aerial perspective, warm golden directional light raking across ' +
  'surfaces, high colour saturation, vivid {{colourNotes}} colours, mid-to-high ' +
  'brightness, no artificial fill, cinematic documentary feel';
