// src/routes/students.js
const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const crypto = require("crypto");
const validator = require("validator");

const { userAuth, requireRole } = require("../middleware/userAuth");
const Student = require("../models/students");
const User = require("../models/user");
const Class = require("../models/class");
const AttendanceLog = require("../models/AttendanceLog");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const claimRateLimit = require("../middleware/claimRateLimit");

// helper: generate claim code (alnum)
function genClaimCode(len = 9) {
  return crypto
    .randomBytes(Math.ceil(len * 0.75))
    .toString("base64")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, len);
}

// helper: generate qrToken
function genQrToken() {
  return crypto.randomBytes(24).toString("hex");
}

// helper: hash claim code using HMAC-SHA256 (server secret)
function hashClaimCode(code) {
  const secret = process.env.CLAIM_SECRET || "dev-claim-secret";
  return crypto.createHmac("sha256", secret).update(String(code)).digest("hex");
}

// helper: constant-time compare (use crypto.timingSafeEqual)
function safeEqualHex(a, b) {
  try {
    const ab = Buffer.from(a, "hex");
    const bb = Buffer.from(b, "hex");
    if (ab.length !== bb.length) return false;
    return crypto.timingSafeEqual(ab, bb);
  } catch (e) {
    return false;
  }
}

/**
 * GET /students
 * Get all students (admin/teacher only)
 */
router.get("/", userAuth, async (req, res) => {
  try {
    // Only admin and teacher can list all students
    if (!['admin', 'teacher'].includes(req.user.role)) {
      return res.status(403).json({ error: "forbidden" });
    }

    const students = await Student.find().lean();
    res.json(students);
  } catch (err) {
    console.error("GET /students error", err);
    res.status(500).json({ error: "server_error" });
  }
});

/**
 * POST /students
 * Create a single student (teacher/admin)
```
 * Body: { name, rollNo, classId, email (optional), createUser: boolean (optional) }
 */
router.post(
  "/",
  userAuth,
  requireRole("teacher", "admin"),
  async (req, res) => {
    try {
      const { name, rollNo, classId, email, createUser } = req.body;
      if (!name || !rollNo || !classId)
        return res
          .status(400)
          .json({ error: "name, rollNo, classId required" });
      if (!mongoose.Types.ObjectId.isValid(classId))
        return res.status(400).json({ error: "invalid classId" });

      const cls = await Class.findById(classId);
      if (!cls) return res.status(404).json({ error: "class not found" });
      if (
        cls.teacherId.toString() !== req.user._id.toString() &&
        req.user.role !== "admin"
      )
        return res.status(403).json({ error: "not your class" });

      // duplicate rollNo check
      const existing = await Student.findOne({
        classId: cls._id,
        rollNo: rollNo.trim(),
      });
      if (existing)
        return res
          .status(409)
          .json({ error: "rollNo already exists in class" });

      // create user optionally
      let userId = null;
      let tempPassword = null;
      if (createUser) {
        if (!validator.isEmail(String(email || "")))
          return res.status(400).json({ error: "invalid email" });
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
          userId = existingUser._id;
          // If teacher requested createUser and the user already exists, still
          // generate an invite token so the teacher can send a link to link
          // the student account. Mark pending invite for response after student save.
          req._invitePendingUserId = existingUser._id;
        } else {
          tempPassword = crypto.randomBytes(6).toString("hex"); // dev-only
          const newUser = new User({
            firstName: (name || "").split(" ")[0],
            lastName: (name || "").split(" ").slice(1).join(" "),
            email: email.toLowerCase(),
            passwordHash: tempPassword,
            role: "student",
            emailVerified: false,
          });
          await newUser.save();
          userId = newUser._id;
          req._invitePendingUserId = newUser._id;
        }
      }

      // create student with claimCode (store only hash) if no userId
      const plainClaim = userId ? null : genClaimCode(9);
      const claimExpiresAt = userId
        ? null
        : new Date(Date.now() + 30 * 24 * 3600 * 1000);
      const student = new Student({
        name: name.trim(),
        rollNo: rollNo.trim(),
        classId: cls._id,
        email: email ? email.toLowerCase() : null,
        userId: userId,
        claimCode: userId ? null : null, // do not persist plaintext
        claimCodeHash: plainClaim ? hashClaimCode(plainClaim) : null,
        claimExpiresAt: claimExpiresAt,
        status: userId ? "claimed" : "unclaimed",
      });

      try {
        await student.save();
      } catch (saveErr) {
        // duplicate index error (race) handling
        if (saveErr.code === 11000)
          return res
            .status(409)
            .json({ error: "rollNo already exists in class" });
        throw saveErr;
      }
      let inviteToken = null;
      if (req._invitePendingUserId) {
        const secret = process.env.JWT_SECRET || "dev-jwt";
        inviteToken = jwt.sign(
          {
            sub: req._invitePendingUserId.toString(),
            studentId: student._id.toString(),
            by: req.user._id.toString(),
            role: "invite",
          },
          secret,
          { expiresIn: "7d" }
        );
      }

      // By default do not return plaintext secrets. For development/testing
      // set DEV_RETURN_SECRETS=true to include `tempPassword`, `claimCode`, and `inviteToken`.
      const resp = {
        student: {
          id: student._id,
          name: student.name,
          rollNo: student.rollNo,
          userId: student.userId,
        }
      };
      if (process.env.DEV_RETURN_SECRETS === 'true') {
        resp.tempPassword = tempPassword;
        resp.claimCode = plainClaim;
        if (inviteToken) resp.inviteToken = inviteToken;
      }
      res.status(201).json(resp);
    } catch (err) {
      console.error("POST /students error", err);
      res.status(500).json({ error: "server_error", detail: err.message });
    }
  }
);

/**
 * POST /students/claim
 * Public endpoint: claim a student using a claimCode.
 * Body: { claimCode, email, password, name? }
 */
router.post(
  "/claim",
  claimRateLimit({ max: 30, windowMs: 60 * 60 * 1000 }),
  async (req, res) => {
    try {
      const { claimCode, email, password, name } = req.body;
      if (!claimCode || !email || !password)
        return res
          .status(400)
          .json({ error: "claimCode, email, password required" });
      if (!validator.isEmail(String(email || "")))
        return res.status(400).json({ error: "invalid email" });

      // find candidate students where unclaimed and not expired
      const now = new Date();
      const codeHash = hashClaimCode(claimCode);
      // find the exact student by hashed claim code
      const student = await Student.findOne({
        claimCodeHash: codeHash,
        status: "unclaimed",
        claimExpiresAt: { $gt: now },
      });
      if (!student) {
        // no matching unclaimed student found (invalid or expired code)
        return res.status(404).json({ error: "invalid_or_expired_claim" });
      }

      // brute-force protection: check per-student lock
      if (student.claimLockedUntil && student.claimLockedUntil > new Date()) {
        return res.status(429).json({ error: "too_many_attempts" });
      }

      // ensure email not already used by another user
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser)
        return res.status(409).json({ error: "email_already_in_use" });

      // create user and link
      const tempUser = new User({
        firstName: (name || student.name || "").split(" ")[0] || "Student",
        lastName:
          (name || student.name || "").split(" ").slice(1).join(" ") || "",
        email: email.toLowerCase(),
        passwordHash: password,
        role: "student",
        emailVerified: true,
      });
      await tempUser.save();

      student.userId = tempUser._id;
      student.status = "claimed";
      student.claimedAt = new Date();
      student.claimCodeHash = null;
      student.claimCode = null;
      student.claimAttempts = 0;
      student.claimLockedUntil = null;
      await student.save();

      res.json({ ok: true, userId: tempUser._id, studentId: student._id });
    } catch (err) {
      console.error("POST /students/claim error", err);
      res.status(500).json({ error: "server_error", detail: err.message });
    }
  }
);





/**
 * POST /students/invite-accept
 * Accept an invite token (stub). Frontend should call with token and new password.
 */
router.post("/invite-accept", async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password)
      return res.status(400).json({ error: "token and password required" });
    const secret = process.env.JWT_SECRET || "dev-jwt";
    let payload;
    try {
      payload = jwt.verify(token, secret);
    } catch (e) {
      return res.status(400).json({ error: "invalid_token" });
    }

    // payload expected: { sub: userId, by: teacherId, role: 'invite', ... }
    if (!payload || !payload.sub)
      return res.status(400).json({ error: "invalid_token_payload" });

    const user = await User.findById(payload.sub);
    if (!user) return res.status(404).json({ error: "user_not_found" });

    // set new password
    user.passwordHash = password; // will be hashed by pre-save
    user.emailVerified = true;
    await user.save();

    // if token contains student linking info (optional), link the student
    let linkedStudent = null;
    if (
      payload.studentId &&
      mongoose.Types.ObjectId.isValid(payload.studentId)
    ) {
      const student = await Student.findById(payload.studentId);
      if (student) {
        student.userId = user._id;
        student.status = "claimed";
        student.claimedAt = new Date();
        student.claimCodeHash = null;
        student.claimCode = null;
        await student.save();
        linkedStudent = student;
      }
    }

    // Fallback: if token didn't include studentId or linking failed, try to link
    // any unclaimed student record that has the same email and no userId.
    if (!linkedStudent) {
      try {
        const fallback = await Student.findOne({
          email: user.email,
          userId: { $in: [null] },
        });
        if (fallback) {
          fallback.userId = user._id;
          fallback.status = "claimed";
          fallback.claimedAt = new Date();
          fallback.claimCodeHash = null;
          fallback.claimCode = null;
          await fallback.save();
          linkedStudent = fallback;
        }
      } catch (e) {
        console.error("invite-accept fallback linking error", e);
      }
    }

    // return an access token for convenience
    const accessToken = user.generateAccessToken();
    res.json({ token: accessToken, name: user.firstName });
  } catch (err) {
    console.error("invite-accept error", err);
    res.status(500).json({ error: "server_error", detail: err.message });
  }
});





/**
 * GET /students/:id
 * Auth: student (self) OR teacher/admin (owner)
 */
router.get("/:id", userAuth, async (req, res) => {
  try {
    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ error: "invalid id" });

    const student = await Student.findById(id).lean();
    if (!student) return res.status(404).json({ error: "student not found" });

    // authorization: student owner OR teacher of the class OR admin
    if (
      req.user.role === "student" &&
      (!student.userId || student.userId.toString() !== req.user._id.toString())
    ) {
      return res.status(403).json({ error: "forbidden" });
    }
    if (req.user.role === "teacher") {
      const cls = await Class.findById(student.classId);
      if (!cls) return res.status(404).json({ error: "class not found" });
      if (
        cls.teacherId.toString() !== req.user._id.toString() &&
        req.user.role !== "admin"
      ) {
        return res.status(403).json({ error: "forbidden" });
      }
    }

    res.json({ student });
  } catch (err) {
    console.error("GET /students/:id", err);
    res.status(500).json({ error: "server_error" });
  }
});




/**
 * PUT /students/:id
 * Update student fields (teacher/admin)
 * Body: { name, rollNo, email, consent }
 */
router.put(
  "/:id",
  userAuth,
  requireRole("teacher", "admin"),
  async (req, res) => {
    try {
      const id = req.params.id;
      if (!mongoose.Types.ObjectId.isValid(id))
        return res.status(400).json({ error: "invalid id" });

      const student = await Student.findById(id);
      if (!student) return res.status(404).json({ error: "student not found" });

      const cls = await Class.findById(student.classId);
      console.log(
        "PUT /students/:id headers content-type =>",
        req.headers["content-type"]
      );
      console.log(
        "PUT /students/:id req.user =>",
        req.user && { id: req.user._id, role: req.user.role }
      );
      console.log(
        "PUT /students/:id class.teacherId =>",
        cls && cls.teacherId && cls.teacherId.toString()
      );

      if (!req.body || Object.keys(req.body).length === 0) {
        return res
          .status(400)
          .json({
            error: "empty_request_body",
            detail:
              "Request body is empty or not parsed. Ensure Content-Type is application/json or use urlencoded form.",
          });
      }
      if (
        cls &&
        cls.teacherId.toString() !== req.user._id.toString() &&
        req.user.role !== "admin"
      ) {
        return res.status(403).json({ error: "forbidden" });
      }

      const allowed = ["name", "rollNo", "email", "consent"];
      const updates = {};
      for (const key of allowed) {
        if (Object.prototype.hasOwnProperty.call(req.body, key))
          updates[key] = req.body[key];
      }

      // if rollNo changing, ensure uniqueness within the class
      if (Object.prototype.hasOwnProperty.call(updates, "rollNo")) {
        const existing = await Student.findOne({
          classId: student.classId,
          rollNo: updates.rollNo,
          _id: { $ne: student._id },
        });
        if (existing)
          return res
            .status(409)
            .json({ error: "rollNo already exists in class" });
      }
      console.log("PUT /students/:id body =>", req.body);

      // apply atomic update and return the updated document
      let updatedStudent;
      try {
        updatedStudent = await Student.findOneAndUpdate(
          { _id: student._id },
          { $set: updates },
          { new: true, runValidators: true }
        );
      } catch (saveErr) {
        if (saveErr && saveErr.code === 11000)
          return res
            .status(409)
            .json({ error: "rollNo already exists in class" });
        throw saveErr;
      }

      res.json({ ok: true, student: updatedStudent });
    } catch (err) {
      console.error("PUT /students/:id", err);
      res.status(500).json({ error: "server_error" });
    }
  }
);




/**
 * DELETE /students/:id
 * Remove student (teacher/admin)
 */
router.delete(
  "/:id",
  userAuth,
  requireRole("teacher", "admin"),
  async (req, res) => {
    try {
      const id = req.params.id;
      if (!mongoose.Types.ObjectId.isValid(id))
        return res.status(400).json({ error: "invalid id" });

      const student = await Student.findById(id);
      if (!student) return res.status(404).json({ error: "student not found" });

      const cls = await Class.findById(student.classId);
      if (
        cls &&
        cls.teacherId.toString() !== req.user._id.toString() &&
        req.user.role !== "admin"
      ) {
        return res.status(403).json({ error: "forbidden" });
      }

      // consider soft-delete in prod; here we remove
      await student.deleteOne();
      res.json({ ok: true });
    } catch (err) {
      console.error("DELETE /students/:id", err);
      res.status(500).json({ error: "server_error" });
    }
  }
);




/**
 * PATCH /students/:id/link-user
 * Link an existing user to student (teacher/admin)
 * Body: { userId }
 */
router.patch(
  "/:id/link-user",
  userAuth,
  requireRole("teacher", "admin"),
  async (req, res) => {
    try {
      const studentId = req.params.id;
      const { userId } = req.body;
      if (
        !mongoose.Types.ObjectId.isValid(studentId) ||
        !mongoose.Types.ObjectId.isValid(userId)
      )
        return res.status(400).json({ error: "invalid id" });

      const student = await Student.findById(studentId);
      if (!student) return res.status(404).json({ error: "student not found" });

      const cls = await Class.findById(student.classId);
      if (
        cls &&
        cls.teacherId.toString() !== req.user._id.toString() &&
        req.user.role !== "admin"
      ) {
        return res.status(403).json({ error: "forbidden" });
      }

      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ error: "user not found" });

      student.userId = user._id;
      student.status = "claimed";
      student.claimCode = null;
      student.claimExpiresAt = null;
      student.claimedAt = new Date();
      await student.save();

      res.json({ ok: true, student });
    } catch (err) {
      console.error("PATCH /students/:id/link-user", err);
      res.status(500).json({ error: "server_error" });
    }
  }
);




/**
 * POST /students/:id/regenerate-claim
 * Regenerate claim code for a student and return it (teacher/admin)
 * In production: don't return; instead email/sms it to the student.
 */
router.post(
  "/:id/regenerate-claim",
  userAuth,
  requireRole("teacher", "admin"),
  async (req, res) => {
    try {
      const studentId = req.params.id;
      if (!mongoose.Types.ObjectId.isValid(studentId))
        return res.status(400).json({ error: "invalid id" });

      const student = await Student.findById(studentId);
      if (!student) return res.status(404).json({ error: "student not found" });

      const cls = await Class.findById(student.classId);
      if (
        cls &&
        cls.teacherId.toString() !== req.user._id.toString() &&
        req.user.role !== "admin"
      ) {
        return res.status(403).json({ error: "forbidden" });
      }

      // only regenerate if unclaimed or to reissue
      const newCode = genClaimCode(9);
      student.claimCodeHash = hashClaimCode(newCode);
      student.claimExpiresAt = new Date(Date.now() + 30 * 24 * 3600 * 1000);
      student.status = "unclaimed";
      student.claimedAt = null;
      student.claimAttempts = 0;
      student.claimLockedUntil = null;
      await student.save();

      // in prod you would email/sms — allow returning the plaintext only with DEV_RETURN_SECRETS
      const out = { ok: true, expiresAt: student.claimExpiresAt };
      if (process.env.DEV_RETURN_SECRETS === 'true') out.claimCode = newCode;
      res.json(out);
    } catch (err) {
      console.error("POST /students/:id/regenerate-claim", err);
      res.status(500).json({ error: "server_error" });
    }
  }
);

/**
 * POST /students/:id/generate-qr
 * Generate or rotate a student's qrToken (teacher/admin)
 * Returns qrToken (in production return only URL for printing or PDF)
 */
router.post(
  "/:id/generate-qr",
  userAuth,
  requireRole("teacher", "admin"),
  async (req, res) => {
    try {
      const studentId = req.params.id;
      if (!mongoose.Types.ObjectId.isValid(studentId))
        return res.status(400).json({ error: "invalid id" });

      const student = await Student.findById(studentId);
      if (!student) return res.status(404).json({ error: "student not found" });

      const cls = await Class.findById(student.classId);
      if (
        cls &&
        cls.teacherId.toString() !== req.user._id.toString() &&
        req.user.role !== "admin"
      ) {
        return res.status(403).json({ error: "forbidden" });
      }

      student.qrToken = genQrToken();
      await student.save();
      res.json({ ok: true, qrToken: student.qrToken });
    } catch (err) {
      console.error("POST /students/:id/generate-qr", err);
      res.status(500).json({ error: "server_error" });
    }
  }
);

module.exports = router;
