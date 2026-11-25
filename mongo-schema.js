const shiftValidator = {
  $jsonSchema: {
    bsonType: "object",
    required: ["title", "siteId", "startsAt", "endsAt", "capacity", "status", "createdAt"],
    properties: {
      title: { bsonType: "string", minLength: 1 },
      siteId: { bsonType: "objectId" },
      startsAt: { bsonType: "date" },
      endsAt: { bsonType: "date" },
      capacity: { bsonType: "int", minimum: 1 },
      status: { enum: ["open", "full", "cancelled", "completed"] },
      createdAt: { bsonType: "date" }
    }
  }
};

const signupValidator = {
  $jsonSchema: {
    bsonType: "object",
    required: ["shiftId", "volunteerId", "signedUpAt", "status", "attendanceMarkedAt"],
    properties: {
      shiftId: { bsonType: "objectId" },
      volunteerId: { bsonType: "objectId" },
      signedUpAt: { bsonType: "date" },
      status: { enum: ["signed_up", "attended", "no_show", "cancelled"] },
      attendanceMarkedAt: { bsonType: ["date", "null"] }
    }
  }
};

function createOrUpdateCollection(name, validator) {
  const existing = db.getCollectionInfos({ name });
  if (existing.length === 0) {
    db.createCollection(name, {
      validator,
      validationLevel: "strict",
      validationAction: "error"
    });
    return;
  }

  assert.commandWorked(db.runCommand({
    collMod: name,
    validator,
    validationLevel: "strict",
    validationAction: "error"
  }));
}

createOrUpdateCollection("shifts", shiftValidator);
createOrUpdateCollection("signups", signupValidator);

db.shifts.createIndex(
  { siteId: 1, status: 1, startsAt: 1 },
  { name: "site_status_startsAt" }
);

db.signups.createIndex(
  { shiftId: 1, volunteerId: 1 },
  { name: "shift_volunteer_unique", unique: true }
);
