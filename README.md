# Volunteer shifts and signups

This example models scheduled volunteer shifts and the signups that track each
volunteer's registration and attendance. Run `mongo-schema.js` with `mongosh`
connected to the target database to create or update the collection validators
and indexes:

```sh
mongosh "mongodb://localhost:27017/volunteer_coordination" --file mongo-schema.js
```

## Entities and relationship

- **Shift** (`shifts`): a volunteer opportunity at a site, with a time window,
  capacity, and lifecycle status.
- **Signup** (`signups`): one volunteer's registration for a shift. Its
  `shiftId` is an ObjectId reference to `shifts._id`; `volunteerId` is an
  ObjectId owned by the volunteer identity system. Signup `status` records
  registration, attendance, no-show, or cancellation, and
  `attendanceMarkedAt` records when attendance was entered (`null` until then).

Use references rather than embedding signups in a shift: a shift's signup list
can grow, and an individual volunteer's registrations can be queried without
loading every shift. MongoDB does not enforce foreign keys, so the application
must ensure the referenced shift and volunteer exist, prevent signups beyond a
shift's capacity, and decide how to handle signups when a shift is removed.
Keep one signup document per volunteer per shift and update its status instead
of inserting a second record. The application should also ensure `endsAt` is
after `startsAt`, attendance is marked only when appropriate, and
`attendanceMarkedAt` agrees with the attendance status; these are cross-field
or workflow rules not enforced by the collection validators.

## Validation and indexes

The `$jsonSchema` validators require the core fields, BSON types, and allowed
statuses. They reject invalid document shapes, such as a shift with a zero
capacity or a signup with an unsupported status.

1. `shifts: { siteId: 1, status: 1, startsAt: 1 }` supports listing open
   upcoming shifts at a given site, filtered by `siteId` and `status` and
   sorted by `startsAt`. Equality fields precede the date range/sort key.
   **Trade-off:** every shift write must also maintain this index, and it
   consumes storage; its field order is optimized for the site-scoped query,
   not for a global upcoming-shifts listing.
2. `signups: { shiftId: 1, volunteerId: 1 }` is unique. Its `shiftId` prefix
   supports fetching a shift's roster, the full key supports checking a
   volunteer's existing signup for that shift, and uniqueness prevents
   duplicate registrations. **Trade-off:** the index adds write and storage
   cost, and its uniqueness rule means re-signups should update the existing
   signup; it does not support sorting the roster by signup time.

## Smoke test

With a MongoDB server available, run this from the repository directory:

```sh
mongosh "mongodb://localhost:27017" --file test-schema.js
```

The smoke test inserts a valid shift and signup, confirms that invalid capacity
and duplicate signups are rejected, checks the indexes, and drops only the
uniquely named temporary database it created for that run.

Local verification in this workspace:

```text
> node --check mongo-schema.js
PASS (exit code 0)
> node --check test-schema.js
PASS (exit code 0)
> mongosh "mongodb://127.0.0.1:27017" --quiet --eval "db.runCommand({ ping: 1 })"
MongoNetworkError: connect ECONNREFUSED 127.0.0.1:27017
```

The JavaScript syntax checks passed. The database smoke test could not be run
here because no MongoDB server is listening locally; run the command above
against a disposable test instance to verify server-side validation and index
behavior.
# mongo-schema
