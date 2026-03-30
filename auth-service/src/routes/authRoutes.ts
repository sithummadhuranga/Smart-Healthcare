import { Router } from 'express';
import {
  register,
  login,
  refresh,
  logout,
  me,
  listUsers,
  verifyDoctor,
  deactivateUser,
} from '../controllers/authController';
import { verifyToken, requireRole } from '../middleware/verifyToken';

const router = Router();

// ── Public routes ─────────────────────────────────────────────────────────────

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new user
 *     description: Creates a new patient or doctor account. Doctors require admin verification before login.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       201:
 *         description: Registration successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 userId:
 *                   type: string
 *                   example: 663d4f2e7b1e4c001e8f1234
 *                 message:
 *                   type: string
 *                   example: Registration successful
 *       400:
 *         description: Validation error (missing fields, invalid role, short password)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Email already registered
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/register', register);

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login and obtain access token
 *     description: Authenticates a user. Returns a JWT access token in the body and sets a httpOnly refresh token cookie.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login successful
 *         headers:
 *           Set-Cookie:
 *             description: httpOnly refreshToken cookie (7-day expiry)
 *             schema:
 *               type: string
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TokenResponse'
 *       400:
 *         description: Missing email or password
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Account deactivated or doctor not yet verified
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/login', login);

/**
 * @openapi
 * /api/auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Refresh access token
 *     description: Reads the httpOnly refreshToken cookie and issues a new access token.
 *     responses:
 *       200:
 *         description: New access token issued
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TokenResponse'
 *       401:
 *         description: No refresh token cookie / token expired or invalid
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/refresh', refresh);

/**
 * @openapi
 * /api/auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Logout (clear refresh token cookie)
 *     description: Clears the httpOnly refreshToken cookie. Client should also discard the access token.
 *     responses:
 *       200:
 *         description: Logged out successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Logged out successfully
 */
router.post('/logout', logout);

// ── Authenticated routes ───────────────────────────────────────────────────────

/**
 * @openapi
 * /api/auth/me:
 *   get:
 *     tags: [User]
 *     summary: Get current user profile
 *     description: Returns the authenticated user's profile decoded from their JWT.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Current user profile
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserProfile'
 *       401:
 *         description: Missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/me', verifyToken, me);

// ── Admin-only routes ─────────────────────────────────────────────────────────

/**
 * @openapi
 * /api/auth/users:
 *   get:
 *     tags: [Admin]
 *     summary: List all users (admin only)
 *     description: Returns a paginated list of all registered users. Requires admin role.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [patient, doctor, admin]
 *         description: Filter by role
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: List of users
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/UserAdmin'
 *                 total:
 *                   type: integer
 *                 page:
 *                   type: integer
 *                 pages:
 *                   type: integer
 *       401:
 *         description: Unauthenticated
 *       403:
 *         description: Insufficient permissions (not admin)
 */
router.get('/users', verifyToken, requireRole('admin'), listUsers);

/**
 * @openapi
 * /api/auth/users/{id}/verify:
 *   patch:
 *     tags: [Admin]
 *     summary: Verify a doctor account (admin only)
 *     description: Sets isVerified=true for a doctor user, allowing them to login.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User MongoDB ObjectId
 *     responses:
 *       200:
 *         description: Doctor verified
 *       404:
 *         description: User not found
 *       403:
 *         description: Not admin
 */
router.patch('/users/:id/verify', verifyToken, requireRole('admin'), verifyDoctor);

/**
 * @openapi
 * /api/auth/users/{id}/deactivate:
 *   patch:
 *     tags: [Admin]
 *     summary: Deactivate a user account (admin only)
 *     description: Soft-deletes a user by setting isActive=false. Deactivated users cannot login.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User MongoDB ObjectId
 *     responses:
 *       200:
 *         description: User deactivated
 *       404:
 *         description: User not found
 *       403:
 *         description: Not admin
 */
router.patch('/users/:id/deactivate', verifyToken, requireRole('admin'), deactivateUser);

export default router;
