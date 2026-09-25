import { Router } from 'express';
import {
  handleAdminSignup,
  handleTeamSignup,
  handleSignin,
  handleSignout,
  handleGetMe
} from '../controllers/auth.controller.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  adminSignupSchema,
  teamSignupSchema,
  signinSchema
} from '../validators/auth.validator.js';
import { authGuard } from '../middleware/auth.middleware.js';
import {
  checkLoginBruteForce,
  checkSignupRateLimit
} from '../middleware/rateLimit.middleware.js';

const router = Router();

router.post(
  '/admin/signup',
  checkSignupRateLimit,
  validate(adminSignupSchema),
  handleAdminSignup
);

router.post(
  '/signup',
  checkSignupRateLimit,
  validate(teamSignupSchema),
  handleTeamSignup
);

router.post(
  '/signin',
  checkLoginBruteForce,
  validate(signinSchema),
  handleSignin
);

router.post('/signout', authGuard, handleSignout);

router.get('/me', authGuard, handleGetMe);

export default router;
