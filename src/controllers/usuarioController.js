const bcrypt = require("bcryptjs");
const mysql = require("mysql2");
require("dotenv").config();

// Crear la conexión a la base de datos
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// Función genérica para crear un usuario con un permiso específico
const crearUsuarioConPermiso = async (req, res, permiso) => {
  const { nombre, email, contraseña } = req.body;

  // Validar que todos los campos estén presentes
  if (!nombre || !email || !contraseña) {
    return res
      .status(400)
      .json({ message: "Nombre, correo y contraseña son requeridos" });
  }

  // Verificar si el correo ya está registrado
  db.query(
    "SELECT * FROM usuarios WHERE email = ?",
    [email],
    async (err, result) => {
      if (err) {
        return res
          .status(500)
          .json({ message: "Error en la consulta a la base de datos" });
      }

      if (result.length > 0) {
        const usuario = result[0];

        // Verificar si el usuario está inactivo (campo 'activo' igual a 0)
        if (usuario.activo === 0) {
          return res
            .status(400)
            .json({
              message:
                "El usuario ya está registrado y se encuentra inactivo, comuníquese con el administrador",
            });
        }

        return res
          .status(400)
          .json({ message: "El correo electrónico ya está registrado" });
      }

      try {
        // Paso 1: Generar el Salt
        const salt = await bcrypt.genSalt(10);

        // Paso 2: Aplicar el Pepper a la contraseña
        const pepperedPassword = contraseña + process.env.PEPPER; // Concatenamos el pepper a la contraseña

        // Paso 3: Crear el Hash con el Salt y el Pepper
        const hashedPassword = await bcrypt.hash(pepperedPassword, salt);

        // Paso 4: Insertar el nuevo usuario en la base de datos con el permiso proporcionado
        const query =
          "INSERT INTO usuarios (nombre, email, contraseña, salt, permiso) VALUES (?, ?, ?, ?, ?)";
        db.query(
          query,
          [nombre, email, hashedPassword, salt, permiso],
          (err, result) => {
            if (err) {
              return res
                .status(500)
                .json({ message: "Error al crear el usuario" });
            }

            res
              .status(201)
              .json({
                message: "Usuario creado con éxito",
                id: result.insertId,
              });
          }
        );
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error al crear el usuario" });
      }
    }
  );
};

// Controlador para crear un nuevo usuario con permisos de 'usuario' (por defecto)
const crearUsuario = (req, res) => {
  // Llamamos a la función genérica pasando 'usuario' como permiso
  crearUsuarioConPermiso(req, res, "usuario");
};

// Controlador para crear un nuevo usuario con permisos de 'admin' (solo accesible por admin)
const crearUsuarioAdmin = (req, res) => {
  // Llamamos a la función genérica pasando 'admin' como permiso
  crearUsuarioConPermiso(req, res, req.body.permiso || "usuario");
};

// Controlador para actualizar los datos de un usuario
const actualizarUsuario = (req, res) => {
  const { id } = req.params; // ID del usuario a actualizar
  const { nombre, email, contraseña, permiso } = req.body;
  const usuarioId = req.user.id; // ID del usuario autenticado (de la decodificación del JWT)

  // Verificar si el usuario está intentando modificar sus propios datos o es un admin
  if (id != usuarioId && req.user.permiso !== "admin") {
    return res
      .status(403)
      .json({ message: "No tienes permisos para modificar este usuario." });
  }

  // Primero, verificamos si el usuario está inactivo (activo = 0)
  db.query(
    "SELECT activo FROM usuarios WHERE id = ?",
    [id],
    async (err, result) => {
      if (err) {
        return res
          .status(500)
          .json({ message: "Error en la consulta a la base de datos" });
      }

      if (result.length === 0) {
        return res.status(404).json({ message: "Usuario no encontrado" });
      }

      const usuario = result[0];

      // Verificar si el usuario está inactivo
      if (usuario.activo === 0) {
        return res.status(400).json({ message: "Usuario inhabilitado" });
      }

      // Preparar la consulta
      let query = "UPDATE usuarios SET";
      const params = [];

      // Solo agregamos a la consulta los campos que fueron proporcionados
      if (nombre) {
        query += " nombre = ?,";
        params.push(nombre);
      }

      if (email) {
        query += " email = ?,";
        params.push(email);
      }

      if (contraseña) {
        try {
          // Paso 1: Generar el Salt
          const salt = await bcrypt.genSalt(10);

          // Paso 2: Concatenar el Pepper a la contraseña
          const pepperedPassword = contraseña + process.env.PEPPER; // Concatenamos el pepper a la contraseña

          // Paso 3: Crear el Hash con el Salt y el Pepper
          const hashedPassword = await bcrypt.hash(pepperedPassword, salt);

          // Agregar la contraseña cifrada a la consulta
          params.push(hashedPassword);
          query += " contraseña = ?,";
        } catch (error) {
          return res
            .status(500)
            .json({ message: "Error al procesar la contraseña" });
        }
      }

      if (permiso && req.user.permiso === "admin") {
        query += " permiso = ?,";
        params.push(permiso);
      } else if (permiso) {
        return res
          .status(403)
          .json({
            message:
              "Solo el administrador puede modificar los permisos de un usuario.",
          });
      }

      // Eliminar la última coma extra en la consulta
      query = query.slice(0, -1);

      // Agregar la condición para actualizar el usuario con el ID especificado
      query += " WHERE id = ?";
      params.push(id);

      // Ejecutar la consulta
      db.query(query, params, (err, result) => {
        if (err) {
          return res
            .status(500)
            .json({ message: "Error al actualizar el usuario" });
        }

        res.status(200).json({ message: "Usuario actualizado con éxito" });
      });
    }
  );
};

// Función para inhabilitar un usuario
const inhabilitarUsuario = (req, res) => {
  const { id } = req.params;  // ID del usuario a inhabilitar
  const usuarioId = req.user.id; // ID del usuario autenticado (de la decodificación del JWT)

  // Verificar si el usuario está intentando inhabilitar su propio perfil o es un admin
  if (id != usuarioId && req.user.permiso !== 'admin') {
    return res.status(403).json({ message: 'No tienes permisos para inhabilitar este usuario.' });
  }

  // Verificar si el usuario existe
  db.query('SELECT * FROM usuarios WHERE id = ?', [id], (err, result) => {
    if (err) {
      return res.status(500).json({ message: 'Error en la consulta a la base de datos' });
    }

    if (result.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Verificar si el usuario ya está inhabilitado (activo = 0)
    if (result[0].activo === 0) {
      return res.status(400).json({ message: 'El usuario ya está inhabilitado' });
    }

    // Realizar el "soft delete" (inhabilitar el usuario)
    db.query('UPDATE usuarios SET activo = 0, fecha_inactivacion = CURRENT_TIMESTAMP WHERE id = ?', [id], (err, result) => {
      if (err) {
        return res.status(500).json({ message: 'Error al inhabilitar el usuario' });
      }

      res.status(200).json({ message: 'Usuario inhabilitado con éxito' });
    });
  });
};

// Función para habilitar un usuario
const habilitarUsuario = (req, res) => {
  const { id } = req.params;  // ID del usuario a habilitar

  // Verificar si el usuario existe
  db.query('SELECT * FROM usuarios WHERE id = ?', [id], (err, result) => {
    if (err) {
      return res.status(500).json({ message: 'Error en la consulta a la base de datos' });
    }

    if (result.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Verificar si el usuario ya está habilitado (activo = 1)
    if (result[0].activo === 1) {
      return res.status(400).json({ message: 'El usuario ya está habilitado' });
    }

    // Realizar la habilitación (poner activo = 1)
    db.query('UPDATE usuarios SET activo = 1, fecha_inactivacion = null WHERE id = ?', [id], (err, result) => {
      if (err) {
        return res.status(500).json({ message: 'Error al habilitar el usuario' });
      }

      res.status(200).json({ message: 'Usuario habilitado con éxito' });
    });
  });
};

const obtenerUsuarios = (req, res) => {
  const { id } = req.query;

  let query = 'SELECT id, nombre, email FROM usuarios WHERE 1=1'; // 1=1 es una condición siempre verdadera, que facilita la concatenación de filtros

  const params = [];

  // Agregar filtros a la consulta si están presentes en los parámetros
  if (id) {
    query += ' AND id = ?';
    params.push(id);
  }

  query += ' AND activo = 1'; // Solo libros activos

  // Ejecutar la consulta
  db.query(query, params, (err, result) => {
    if (err) {
      return res.status(500).json({ message: 'Error en la consulta a la base de datos' });
    }

    if (result.length === 0) {
      return res.status(404).json({ message: 'No se encontraron usuarios con esos parámetros de búsqueda' });
    }

    // Responder con los resultados de la búsqueda
    res.status(200).json(result);
  });
};

module.exports = { crearUsuario, crearUsuarioAdmin, actualizarUsuario, inhabilitarUsuario, habilitarUsuario, obtenerUsuarios };
