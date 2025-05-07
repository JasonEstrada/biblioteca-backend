const express = require('express');
const router = express.Router();
const { crearLibro, buscarLibro, actualizarLibro, inhabilitarLibro, habilitarLibro, reservarLibro, obtenerHistorialReservas, entregarLibro } = require('../controllers/libroController');
const { verificarPermiso, verificarToken } = require('../middleware/authMiddleware');

// Ruta para crear un libro (solo para usuarios con permisos 'admin')
router.post('/crear', verificarPermiso('admin'), crearLibro);

router.get('/buscar', buscarLibro);

router.put('/actualizar/:id', verificarToken, verificarPermiso('admin'), actualizarLibro);

router.delete('/inhabilitar/:id', verificarToken, verificarPermiso('admin'), inhabilitarLibro);

router.put('/habilitar/:id', verificarToken, verificarPermiso('admin'), habilitarLibro);

router.post('/reservar/:id', verificarToken, reservarLibro);

router.get('/reservas/:id', verificarToken, obtenerHistorialReservas);

router.put('/entregar/:id', verificarToken, verificarPermiso('admin'), entregarLibro);


module.exports = router;
