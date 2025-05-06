const express = require('express');
const router = express.Router();
const { crearUsuario, crearUsuarioAdmin, actualizarUsuario, inhabilitarUsuario, habilitarUsuario, obtenerUsuarios  } = require('../controllers/usuarioController');
const { verificarPermiso, verificarToken } = require('../middleware/authMiddleware');

// Ruta para crear un usuario (solo un admin puede crear un usuario con permisos de admin)
router.post('/admin/registro', verificarPermiso('admin'), crearUsuarioAdmin);

router.post('/registro', crearUsuario);

router.put('/actualizar/:id', verificarToken, actualizarUsuario);

router.delete('/inhabilitar/:id', verificarToken, inhabilitarUsuario);

router.put('/admin/habilitar/:id', verificarToken, verificarPermiso('admin'), habilitarUsuario);

router.get('/buscar', obtenerUsuarios);

module.exports = router;
