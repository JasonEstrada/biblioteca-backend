const express = require('express');
const router = express.Router();
const { crearUsuario, crearUsuarioAdmin } = require('../controllers/usuarioController');
const { verificarPermiso } = require('../middleware/authMiddleware');

// Ruta para crear un usuario (solo un admin puede crear un usuario con permisos de admin)
router.post('/admin/registro', verificarPermiso('admin'), crearUsuarioAdmin);

router.post('/registro', crearUsuario);

module.exports = router;
