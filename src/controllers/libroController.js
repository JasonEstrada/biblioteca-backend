const mysql = require("mysql2");
require("dotenv").config();

// Crear la conexión a la base de datos
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

const crearLibro = (req, res) => {
  const { titulo, autor, genero, editorial, fecha_publicacion } = req.body;

  // Validar que todos los campos estén presentes
  if (!titulo || !autor || !genero || !editorial || !fecha_publicacion) {
    return res
      .status(400)
      .json({ message: "Todos los campos son obligatorios" });
  }

  // Insertar el nuevo libro en la base de datos
  const query =
    "INSERT INTO libros (titulo, autor, genero, editorial, fecha_publicacion) VALUES (?, ?, ?, ?, ?)";
  db.query(
    query,
    [titulo, autor, genero, editorial, fecha_publicacion],
    (err, result) => {
      if (err) {
        return res.status(500).json({ message: "Error al crear el libro" });
      }

      res
        .status(201)
        .json({ message: "Libro creado con éxito", id: result.insertId });
    }
  );
};

// Función para buscar libros (por ID o con filtros)
const buscarLibro = (req, res) => {
  const {
    id,
    genero,
    fecha_publicacion,
    editorial,
    autor,
    nombre,
    disponibilidad,
    incluyendo_inhabilitados
  } = req.query;

  let query =
    "SELECT id, titulo, autor, genero, editorial, fecha_publicacion, disponibilidad FROM libros WHERE 1=1"; // 1=1 es una condición siempre verdadera, que facilita la concatenación de filtros

  const params = [];

  // Agregar filtros a la consulta si están presentes en los parámetros
  if (id) {
    query += " AND id = ?";
    params.push(id);
  }
  if (genero) {
    query += " AND genero LIKE ?";
    params.push(`%${genero}%`); // `%` es para hacer búsqueda por coincidencias parciales
  }
  if (fecha_publicacion) {
    query += " AND fecha_publicacion = ?";
    params.push(fecha_publicacion);
  }
  if (editorial) {
    query += " AND editorial LIKE ?";
    params.push(`%${editorial}%`);
  }
  if (autor) {
    query += " AND autor LIKE ?";
    params.push(`%${autor}%`);
  }
  if (nombre) {
    query += " AND titulo LIKE ?";
    params.push(`%${nombre}%`);
  }
  if (disponibilidad !== undefined) {
    query += " AND disponibilidad = ?";
    params.push(disponibilidad === "true" ? 1 : 0);
  }

  // Si no se solicita incluir inhabilitados, solo mostrar los libros activos
  if (!incluyendo_inhabilitados || incluyendo_inhabilitados !== 'true') {
    query += " AND activo = 1"; // Solo libros activos por defecto
  }

  // Ejecutar la consulta
  db.query(query, params, (err, result) => {
    if (err) {
      return res
        .status(500)
        .json({ message: "Error en la consulta a la base de datos" });
    }

    if (result.length === 0) {
      return res
        .status(404)
        .json({
          message: "No se encontraron libros con esos parámetros de búsqueda",
        });
    }

    // Responder con los resultados de la búsqueda
    res.status(200).json(result);
  });
};

// Función para actualizar un libro
const actualizarLibro = (req, res) => {
  const { id } = req.params; // ID del libro a actualizar
  const {
    titulo,
    autor,
    genero,
    fecha_publicacion,
    editorial,
    disponibilidad,
  } = req.body;

  // Verificar si el libro existe
  db.query("SELECT activo FROM libros WHERE id = ?", [id], (err, result) => {
    if (err) {
      return res
        .status(500)
        .json({ message: "Error en la consulta a la base de datos" });
    }

    if (result.length === 0) {
      return res.status(404).json({ message: "Libro no encontrado" });
    }

    const libro = result[0];

    // Verificar si el libro está inactivo
    if (libro.activo === 0) {
      return res.status(400).json({ message: "Libro inhabilitado" });
    }

    // Preparar la consulta para actualizar los campos proporcionados
    let query = "UPDATE libros SET";
    const params = [];

    // Solo agregamos a la consulta los campos que fueron proporcionados
    if (titulo) {
      query += " titulo = ?,";
      params.push(titulo);
    }

    if (autor) {
      query += " autor = ?,";
      params.push(autor);
    }

    if (genero) {
      query += " genero = ?,";
      params.push(genero);
    }

    if (fecha_publicacion) {
      query += " fecha_publicacion = ?,";
      params.push(fecha_publicacion);
    }

    if (editorial) {
      query += " editorial = ?,";
      params.push(editorial);
    }

    if (disponibilidad !== undefined) {
      query += " disponibilidad = ?,";
      params.push(disponibilidad ? 1 : 0); // Convertir disponibilidad a booleano (1 o 0)
    }

    // Eliminar la última coma extra en la consulta
    query = query.slice(0, -1);

    // Agregar la condición para actualizar el libro con el ID especificado
    query += " WHERE id = ?";
    params.push(id);

    // Ejecutar la consulta
    db.query(query, params, (err, result) => {
      if (err) {
        return res
          .status(500)
          .json({ message: "Error al actualizar el libro" });
      }

      res.status(200).json({ message: "Libro actualizado con éxito" });
    });
  });
};

// Función para inhabilitar un libro
const inhabilitarLibro = (req, res) => {
  const { id } = req.params; // ID del libro a inhabilitar

  // Verificar si el libro existe
  db.query("SELECT * FROM libros WHERE id = ?", [id], (err, result) => {
    if (err) {
      return res
        .status(500)
        .json({ message: "Error en la consulta a la base de datos" });
    }

    if (result.length === 0) {
      return res.status(404).json({ message: "Libro no encontrado" });
    }

    // Verificar si el libro ya está inhabilitado (activo = 0)
    if (result[0].activo === 0) {
      return res.status(400).json({ message: "El libro ya está inhabilitado" });
    }

    // Realizar el "soft delete" (inhabilitar el libro)
    db.query(
      "UPDATE libros SET activo = 0, fecha_inactivacion = CURRENT_TIMESTAMP WHERE id = ?",
      [id],
      (err, result) => {
        if (err) {
          return res
            .status(500)
            .json({ message: "Error al inhabilitar el libro" });
        }

        res.status(200).json({ message: "Libro inhabilitado con éxito" });
      }
    );
  });
};

const habilitarLibro = (req, res) => {
  const { id } = req.params; // ID del libro a habilitar

  // Verificar si el libro existe
  db.query("SELECT * FROM libros WHERE id = ?", [id], (err, result) => {
    if (err) {
      return res
        .status(500)
        .json({ message: "Error en la consulta a la base de datos" });
    }

    if (result.length === 0) {
      return res.status(404).json({ message: "Libro no encontrado" });
    }

    // Verificar si el libro ya está habilitado (activo = 1)
    if (result[0].activo === 1) {
      return res.status(400).json({ message: "El libro ya está habilitado" });
    }

    // Realizar la habilitación (poner activo = 1)
    db.query(
      "UPDATE libros SET activo = 1, fecha_inactivacion = null WHERE id = ?",
      [id],
      (err, result) => {
        if (err) {
          return res
            .status(500)
            .json({ message: "Error al habilitar el libro" });
        }

        res.status(200).json({ message: "Libro habilitado con éxito" });
      }
    );
  });
};

// Función para reservar un libro
const reservarLibro = (req, res) => {
  const { id } = req.params; // ID del libro a reservar
  const usuarioId = req.user.id; // ID del usuario autenticado (de la decodificación del JWT)
  const nombreUsuario = req.user.nombre; // Nombre del usuario autenticado
  const { fecha_entrega } = req.body; // Fecha de entrega proporcionada por el usuario

  // Verificar si la fecha de entrega es válida
  if (!fecha_entrega || isNaN(new Date(fecha_entrega).getTime())) {
    return res.status(400).json({ message: "Fecha de entrega inválida." });
  }

  // Verificar si el libro está disponible (activo = 1)
  db.query(
    "SELECT * FROM libros WHERE id = ? AND disponibilidad = 1 AND activo = 1",
    [id],
    (err, result) => {
      if (err) {
        return res
          .status(500)
          .json({ message: "Error en la consulta a la base de datos" });
      }

      if (result.length === 0) {
        return res
          .status(404)
          .json({ message: "Libro no disponible para reserva" });
      }

      // Obtener la fecha actual (fecha de la reserva)
      const fechaReserva = new Date();

      //fechaReservaFormatted = fechaReserva.toISOString().slice(0, 19).replace("T", " ");

      // Verificar que la fecha de entrega no sea anterior a la fecha de reserva
      if (new Date(fecha_entrega) < fechaReserva) {
        return res
          .status(400)
          .json({
            message:
              "La fecha de entrega no puede ser anterior a la fecha de reserva.",
          });
      }

      // Realizar la reserva en la base de datos
      const query =
        "INSERT INTO reservas (libro_id, usuario_id, nombre_usuario, fecha_reserva, fecha_entrega) VALUES (?, ?, ?, ?, ?)";
      db.query(
        query,
        [id, usuarioId, nombreUsuario, fechaReserva, fecha_entrega],
        (err, result) => {
          if (err) {
            return res
              .status(500)
              .json({ message: "Error al realizar la reserva" });
          }

          // Marcar el libro como no disponible (disponibilidad = 0) después de la reserva
          const queryActualizarDisponibilidad =
            "UPDATE libros SET disponibilidad = 0 WHERE id = ?";
          db.query(queryActualizarDisponibilidad, [id], (err, result) => {
            if (err) {
              return res
                .status(500)
                .json({
                  message: "Error al actualizar la disponibilidad del libro",
                });
            }

            res
              .status(201)
              .json({
                message: "Reserva realizada con éxito"
              });
          });
        }
      );
    }
  );
};

// Función para obtener el historial de reservas de un libro
const obtenerHistorialReservas = (req, res) => {
  const { id } = req.params; // ID del libro para obtener su historial de reservas

  // Consultar el historial de reservas de un libro
  db.query('SELECT * FROM reservas WHERE libro_id = ?', [id], (err, result) => {
    if (err) {
      return res.status(500).json({ message: 'Error en la consulta a la base de datos' });
    }

    if (result.length === 0) {
      return res.status(404).json({ message: 'No se encontraron reservas para este libro' });
    }

    res.status(200).json(result); // Retornar el historial de reservas
  });
};

const entregarLibro = (req, res) => {
  const { id } = req.params; // ID de la reserva a entregar

  // Obtener la fecha actual como fecha de entrega
  const fechaEntrega = new Date().toISOString().slice(0, 19).replace("T", " ");  // Formato MySQL: YYYY-MM-DD HH:MM:SS

  // Verificar si la reserva existe
  db.query('SELECT * FROM reservas WHERE id = ?', [id], (err, result) => {
    if (err) {
      return res.status(500).json({ message: 'Error en la consulta a la base de datos' });
    }

    if (result.length === 0) {
      return res.status(404).json({ message: 'Reserva no encontrada' });
    }

    libro_id = result[0].libro_id; // ID del libro asociado a la reserva

    // Verificar si la reserva ya fue entregada
    if (result[0].activo === 0) {
      return res.status(400).json({ message: 'Esta reserva ya se entregó' });
    }

    // Actualizar la fecha de entrega en la reserva
    const queryActualizarReserva = 'UPDATE reservas SET fecha_entrega = ?, activo = 0 WHERE id = ?';
    db.query(queryActualizarReserva, [fechaEntrega, id], (err, result) => {
      if (err) {
        return res.status(500).json({ message: 'Error al actualizar la reserva' });
      }

      // Marcar el libro como disponible (disponibilidad = 1)
      const queryActualizarDisponibilidad = 'UPDATE libros SET disponibilidad = 1 WHERE id = ?';
      db.query(queryActualizarDisponibilidad, [libro_id], (err, result) => {
        if (err) {
          return res.status(500).json({ message: 'Error al actualizar la disponibilidad del libro' });
        }

        res.status(200).json({ message: 'Libro entregado y disponibilidad actualizada con éxito' });
      });
    });
  });
};

module.exports = {
  crearLibro,
  buscarLibro,
  actualizarLibro,
  inhabilitarLibro,
  habilitarLibro,
  reservarLibro,
  obtenerHistorialReservas,
  entregarLibro
};
