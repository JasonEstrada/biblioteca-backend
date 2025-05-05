const jwt = require('jsonwebtoken');
require('dotenv').config();


// Middleware para verificar si el usuario está autenticado y tiene permisos
const verificarPermiso = (permisoRequerido) => {
  return (req, res, next) => {
    // Obtener el token del header Authorization
    const token = req.header('Authorization');

    if (!token) {
      return res.status(401).json({ message: 'No autorizado. No hay token.' });
    }

    try {
      // Verificar el token usando la clave secreta
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Verificar si el usuario tiene el permiso requerido
      if (decoded.permiso !== permisoRequerido) {
        return res.status(403).json({ message: 'No tienes permisos para realizar esta acción.' });
      }

      // Si tiene el permiso, permitir continuar con la solicitud
      req.user = decoded;  
      next();
    } catch (error) {
      console.error(error);
      return res.status(401).json({ message: 'Token no válido.' });
    }
  };
};

// Middleware para verificar el token JWT
const verificarToken = (req, res, next) => {
  const token = req.header('Authorization');

  // Verificar si el token existe
  if (!token) {
    return res.status(401).json({ message: 'No autorizado. No hay token.' });
  }

  // Verificar el token usando la clave secreta
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; 
    next(); 
  } catch (error) {
    console.error(error);
    return res.status(401).json({ message: 'Token no válido.' });
  }
};

module.exports = { verificarPermiso, verificarToken };
