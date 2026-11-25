const testDatabase = "volunteer_coordination_schema_test_" + new ObjectId().toHexString();
db = db.getSiblingDB(testDatabase);
load("mongo-schema.js");

const shifts = db.getCollection("shifts");
const signups = db.getCollection("signups");
const siteId = new ObjectId();
const shiftId = new ObjectId();
const volunteerId = new ObjectId();
const now = new Date();

shifts.insertOne({
  _id: shiftId,
  title: "Community garden morning",
  siteId,
  startsAt: new Date(now.getTime() + 60 * 60 * 1000),
  endsAt: new Date(now.getTime() + 3 * 60 * 60 * 1000),
  capacity: 8,
  status: "open",
  createdAt: now
});

signups.insertOne({
  shiftId,
  volunteerId,
  signedUpAt: now,
  status: "signed_up",
  attendanceMarkedAt: null
});

function expectRejected(label, operation, expectedCode) {
  let rejected = false;
  try {
    operation();
  } catch (error) {
    rejected = expectedCode === undefined || error.code === expectedCode;
  }
  assert(rejected, label + " should be rejected");
  print("PASS " + label);
}

expectRejected("shift with zero capacity", function () {
  shifts.insertOne({
    title: "Invalid shift",
    siteId,
    startsAt: now,
    endsAt: new Date(now.getTime() + 60 * 60 * 1000),
    capacity: 0,
    status: "open",
    createdAt: now
  }, 121);
});

expectRejected("duplicate signup for the same volunteer and shift", function () {
  signups.insertOne({
    shiftId,
    volunteerId,
    signedUpAt: now,
    status: "signed_up",
    attendanceMarkedAt: null
  });
}, 11000);

const shiftIndex = shifts.getIndexes().some(function (index) {
  return index.name === "site_status_startsAt";
});
const signupIndex = signups.getIndexes().some(function (index) {
  return index.name === "shift_volunteer_unique" && index.unique === true;
});
assert(shiftIndex, "shift discovery index should exist");
assert(signupIndex, "unique signup index should exist");
print("PASS both query indexes exist");

assert.commandWorked(db.dropDatabase());
print("PASS smoke test complete; isolated database " + testDatabase + " dropped");
