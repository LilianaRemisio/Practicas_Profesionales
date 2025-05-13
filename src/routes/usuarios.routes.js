import { Router } from "express";
import pool from "../database.js";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import { console } from "inspector";



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
        console.log("Solicitud POST recibida en /login");    console.log("Datos recibidos:", req.body);
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

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(Contrasena, salt);

    // Insertar usuario con la contraseña encriptada
    const newUser = { Nombre, Telefono, Email, Contrasena: hashedPassword };
    await pool.query('INSERT INTO usuarios SET ?', [newUser]);

    res.redirect('/login?addSuccess=true&message=Usuario registrado con éxito');
});
export default router;