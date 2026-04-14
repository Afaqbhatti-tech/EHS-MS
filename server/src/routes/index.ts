import { Router } from 'express';
import { authRouter } from './auth.js';
import { usersRouter } from './users.js';
import { rolesRouter } from './roles.js';
import { reportsRouter } from './reports.js';
import { observationsRouter } from './observations.js';

export const router = Router();

// Auth & User management
router.use('/auth', authRouter);
router.use('/users', usersRouter);
router.use('/roles', rolesRouter);

// Reports
router.use('/reports', reportsRouter);

// Observations
router.use('/observations', observationsRouter);

router.get('/', (_req, res) => {
  res.json({
    message: 'EHS-OS API v1.0',
    modules: [
      'dashboard',
      'observations',
      'permits',
      'permit-amendments',
      'mockup-register',
      'weekly-mom',
      'manpower',
      'training-matrix',
      'checklists',
      'equipment',
      'incidents',
      'violations',
      'mock-drills',
      'document-control',
      'campaigns',
      'poster-generator',
      'kpis-reports',
      'environmental',
      'users-permissions',
      'ai-intelligence',
    ],
  });
});
