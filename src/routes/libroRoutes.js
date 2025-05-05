const express = require('express');
const router = express.Router();
const { crearLibro, buscarLibro } = require('../controllers/libroController');
const { verificarPermiso, verificarToken } = require('../middleware/authMiddleware');

// Ruta para crear un libro (solo para usuarios con permisos 'admin')
router.post('/crear', verificarPermiso('admin'), crearLibro);

router.get('/buscar', verificarToken, buscarLibro);

module.exports = router;
