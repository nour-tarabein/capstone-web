# Anonymous self-registration writes a real attendee row, no auth

`supabase/schema.sql`'s entire security model, up to now, has been: anon can *read* the opted-in roster and approved events, and can *write* only through narrow SECURITY DEFINER RPCs (`rsvp_create`, `event_submit`) that never let the client insert a new identity into `attendees`. Check-in needs exactly that, though: a stranger scanning a QR code, with no login, needs to create their own `attendees` row live.

We're adding a new SECURITY DEFINER RPC (e.g. `attendee_checkin`) that takes a name, department, and conference id, and inserts a row — the first anon write path in this schema that creates a new identity rather than acting on an existing one. There is no authentication behind it: anyone with the anon key (which the schema's own comments call "safe to expose in the browser") could call it repeatedly to create fake attendees.

We accepted this because the only data at stake is a first name, last name, and department for a single-night live demo — not the RSVP/attendance data the rest of the schema goes out of its way to protect (DESIGN.md #9's no-reverse-lookup guarantee is untouched; this RPC does not expose or bypass it). A future reader should not "fix" this by adding real auth unless the conference stops being a one-off live demo.
