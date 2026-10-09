// Strict Role-Based Authorization Middleware for MineGuard AI

export const requireRole = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({
        success: false,
        message: 'Access Denied: Unauthenticated user payload.'
      });
    }

    const userRole = req.user.role.toLowerCase();
    const normalizedAllowed = allowedRoles.map(r => r.toLowerCase());

    // Allow supervisor/admin equivalents for supervisor endpoints
    const isSupervisorRole = ['supervisor', 'admin'].includes(userRole);
    const requiresSupervisor = normalizedAllowed.some(r => ['supervisor', 'admin'].includes(r));

    if (requiresSupervisor && isSupervisorRole) {
      return next();
    }

    if (normalizedAllowed.includes(userRole)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: `Access Denied: Role '${req.user.role}' is not authorized to access this resource. Required role(s): [${allowedRoles.join(', ')}]`
    });
  };
};
export const requireMineAccess = (req, res, next) => {
  if (!req.user || !req.user.role) {
    return res.status(401).json({ success: false, message: 'Unauthenticated' });
  }
  
  if (req.user.role === 'admin') return next();

  const requestedMineId = req.params.mineId || req.body.mineId || req.query.mineId;
  
  if (requestedMineId && req.user.assignedMineLocation !== requestedMineId && req.user.role !== 'supervisor') {
    return res.status(403).json({ success: false, message: 'Not authorized for this mine/zone' });
  }

  next();
};
