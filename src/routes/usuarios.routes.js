import { Router } from "express";
import pool from "../database.js";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import jwt from "jsonwebtoken";

// Cargar variables de entorno
dotenv.config();

// Definir SECRET_KEY desde `.env`
const SECRET_KEY = process.env.SECRET_KEY;

// Obtener el directorio correcto para ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configurar almacenamiento con Multer
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = path.join(__dirname, "../public/img"); // Ajusta la ruta según la ubicación de `public`
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

// Inicializa Multer
const upload = multer({ storage });
const router = Router();


router.get('/login', async (req, res) => { //url cargue de Login
    try {
        //const [result] = await pool.query("Select * from productos");
        console.log("Solicitud POST recibida en /login"); console.log("Datos recibidos:", req.body);
        res.render('usuarios/login', { query: req.query });

    }
    catch (err) {
        res.status(500).json({ message: err.message })
    }

});

router.post('/userRegister', async (req, res) => { //registrar usuario

    const { Nombre, Telefono, Email, Contrasena, RepetirContrasena } = req.body;
    console.log("Solicitud POST recibida en /login");
    console.log("Datos recibidos:", req.body);

    // Validar que las contraseñas coincidan
    if (Contrasena !== RepetirContrasena) {
        return res.redirect('/login?addSuccess=false&message=Las contraseñas no coinciden');
    }

    // Validar que la contraseña tenga al menos 8 caracteres
    if (!Contrasena || Contrasena.length < 8) {
        return res.redirect('/login?addSuccess=false&message=La contraseña debe tener al menos 8 caracteres');
    }

    // Validar si el correo ya está registrado
    const [rows] = await pool.query('SELECT count(*) as conteo FROM usuarios WHERE Email = ?', [Email]);

    if (rows[0].conteo > 0) {
        return res.redirect('/login?addSuccess=false&message=Este correo ya está registrado');
    }

    if (!Nombre.match(/^[a-zA-Z\s]+$/)) {
        return res.redirect('/login?addSuccess=false&message=Nombre inválido');
    }
    if (!Telefono.match(/^\d{7,15}$/)) {
        return res.redirect('/login?addSuccess=false&message=Teléfono inválido');
    }

    // Encriptar la contraseña antes de guardarla

    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(Contrasena, salt);

    // Insertar usuario con la contraseña encriptada
    const newUser = { Nombre, Telefono, Email, Rol: ClientRequest, Contrasena: hashedPassword };
    await pool.query('INSERT INTO usuarios SET ?', [newUser]);

    res.redirect('/login?addSuccess=true&message=Usuario registrado con éxito');
});

router.post('/login', async (req, res) => {  //login de usuario
    console.log("✅ POST /login recibido en el servidor");

    const { loginEmail, loginPassword } = req.body;

    // Verificar si el usuario existe
    const [rows] = await pool.query('SELECT * FROM usuarios WHERE Email = ?', [loginEmail]);
    if (rows.length === 0) {
        return res.redirect('/login?addSuccess=false&message=Correo no registrado');
    }

    // Obtener la contraseña cifrada guardada en la base de datos
    const storedPassword = rows[0].Contrasena;

    // Verificar que los valores sean correctos antes de comparar
    //const salt = bcrypt.genSaltSync(10);

    // Comparar la contraseña ingresada con la almacenada
    const passwordMatch = bcrypt.compareSync(loginPassword, storedPassword);

    if (!passwordMatch) {
        //console.log("Contraseña incorrecta, la comparación falló");
        return res.redirect('/login?addSuccess=false&message=Contraseña incorrecta');
    }

    console.log("¡Contraseña correcta! Procediendo con el login...");

    // Generar el código de seguridad para el usuario
    const securityCode = Math.floor(100000 + Math.random() * 900000).toString();
    const salt = await bcrypt.genSalt(10);
    const hashedCode = await bcrypt.hash(securityCode, salt);

    // Guardar el código cifrado en la base de datos
    await pool.query('UPDATE usuarios SET CodSeguridad = ? WHERE Email = ?', [hashedCode, loginEmail]);

    // Enviar el código por correo
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'bell03h@gmail.com',
            pass: 'qhow ndyu lkgw fdln' // Reemplaza con la clave generada
        }
    });


    const mailOptions = {
        from: 'bell03h@gmail.com',
        to: loginEmail,
        subject: 'Código de seguridad para inicio de sesión',
        text: `Tu código de seguridad es: ${securityCode}`
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.log("Error al enviar el correo:", error);
            return res.redirect('/login?addSuccess=false&message=Error al enviar el código de seguridad');
        }
        return res.redirect(`/login?addSuccess=true&message=Código enviado, revisa tu correo&email=${loginEmail}`);
    });
});

// Validación de código de seguridad y generación de JWT
router.post('/codigoSeguridad/:email', async (req, res) => {
    const { loginCodigo } = req.body;
    const { email } = req.params;

    // Verificar si el usuario existe
    const [rows] = await pool.query('SELECT * FROM usuarios WHERE Email = ?', [email]);
    if (rows.length === 0) {
        return res.redirect('/login?addSuccess=false&message=Correo no registrado');
    }

    const codSeguridad = rows[0].CodSeguridad;
    const codSeguridadMatch = bcrypt.compareSync(loginCodigo, codSeguridad);

    if (!codSeguridadMatch) {
        return res.redirect('/login?addSuccess=false&message=Código de seguridad incorrecto');
    }

    // 🔹 **Generar Token JWT con la clave segura**
    const token = jwt.sign(
        { id: rows[0].ID, email: rows[0].Email, rol: rows[0].Rol },
        SECRET_KEY,
        { expiresIn: "2h" }
    );

    //actualiza fecha de ingreso
    await pool.query('UPDATE usuarios SET FechaIngreso = now() WHERE Email = ?', [email]);
    res.cookie('token', token, { httpOnly: true, secure: true, sameSite: 'Strict' });

    if(rows[0].Rol === "Administrador"){
        res.redirect('/boutique');
    }else{
        res.redirect('/perfil');
    }


});

// Middleware para verificar sesión con JWT
const verificarToken = (req, res, next) => {
    console.log("Cookies recibidas:", req.cookies); // Verifica si el token está presente
    const token = req.cookies.token; // Obtener el token desde la cookie

    if (!token) {
        console.log("Token no encontrado");
        return res.status(403).send("No autorizado");
    }

    try {
        const usuario = jwt.verify(token, SECRET_KEY);
        console.log("Usuario decodificado:", usuario); // Muestra los datos extraídos
        req.usuario = usuario;
        next();
    } catch (error) {
        console.error("Error al verificar token:", error);
        res.status(401).send("Token inválido o expirado");
    }
};



// Ruta protegida con JWT
router.get('/perfil/', verificarToken, async (req, res) => {
    const email = req.params;
    const page = parseInt(req.query.page) || 1; // Página actual, por defecto 1
    const limit = 9; // Número de registros por página
    const offset = (page - 1) * limit;

    const [usuario] = await pool.query('SELECT * FROM usuarios  WHERE Email = ?  LIMIT 1', req.usuario.email);
    const [medidas] = await pool.query('SELECT m.* FROM  medidas as m INNER JOIN usuarios as u ON m.Usuarios_PKCliente = u.PKCliente WHERE u.Email = ?  LIMIT 1', req.usuario.email);

    const [pedidos] = await pool.query('SELECT p.PKPedido,p.EstadoPago,p.MedioPago,p.ValorPago,p.Direccion,p.Telefono,p.Correo,p.Fecha,p.Estado,p.TipoEntrega,p.FechaEntrega FROM pedidos as p inner join usuarios as u on p.Clientes_PKCliente = u.PKCliente WHERE u.Email = ?  LIMIT ? OFFSET ?', [req.usuario.email, limit, offset]);

    const [totalResult] = await pool.query('SELECT COUNT(*) AS total FROM pedidos as p inner join usuarios as u on p.Clientes_PKCliente = u.PKCliente WHERE u.Email = ?', req.usuario.email);
    const total = totalResult[0].total || 0;

    res.render('usuarios/perfil', {
        usuario: usuario[0], 
        medidas: medidas[0], 
        pedidos: pedidos,
        currentPage: page,
        totalPages: Math.ceil(total / limit)  });
});

router.get('/api/detallePedido', verificarToken,async (req, res) => {

    if (!req.usuario) {
        return res.status(401).json({ error: "Usuario no autenticado" });
    }

    const emailUsuario = req.usuario.email; 
    const idPedido = req.query.pedido;


    try {
        const idPedido = req.query.pedido;
        const emailUsuario = req.usuario.email;  // Ajusta según autenticación
        console.log("Valor de req.usuario:", req.usuario);

        const query = "SELECT pp.valor AS valor_por_productos, pp.cantidad AS cantidad_por_producto, p.EstadoPago, p.ValorPago AS valor_total, pr.Nombre, pr.Fotografia, pr.Estado, pr.Color, pr.Talla FROM pedidos AS p INNER JOIN usuarios AS u ON p.Clientes_PKCliente = u.PKCliente INNER JOIN pedidos_has_productos AS pp ON p.PKPedido = pp.Pedidos_PKPedido INNER JOIN productos AS pr ON pr.PKProducto = pp.Productos_PKProducto WHERE u.Email = ? AND p.PKPedido = ?";
        
        const detallesPedido = await pool.query(query, [emailUsuario, idPedido]);
        res.json(detallesPedido);
    } catch (error) {
        console.log("Valor de req.usuario:", req.usuario);

        console.error("Error al obtener detalles del pedido:", error);
        res.status(500).json({ error: "Error en el servidor" });
    }
});


router.get('/api/verificarSesion', verificarToken, (req, res) => {

    console.log("Usuario autenticado:", req.usuario);
    if (!req.usuario) {
        return res.json({ sesionActiva: false });
    }

    res.json({
        sesionActiva: true,
        rol: req.usuario.rol // Esto debería ser el rol almacenado en el JWT
    });
});

//cerrar sesion
router.get('/logout', (req, res) => {
    res.clearCookie('token', { httpOnly: true, secure: true, sameSite: 'Strict' });
    res.redirect('/'); // Redirigir al login o página principal
});


export default router;