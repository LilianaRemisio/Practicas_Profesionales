import { Router } from "express";
import pool from "../database.js";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";

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

router.get('/contact', async (req, res) => {
    try {
        const [result] = await pool.query("Select * from boutiques");
        res.render('boutiques/contact', { boutiques: result });
    }
    catch (err) {
        res.status(500).json({ message: err.message })
    }

});

router.get('/questions', async (req, res) => {
    try {
        //const [result] = await pool.query("Select * from boutiques");
        res.render('boutiques/questions');
    }
    catch (err) {
        res.status(500).json({ message: err.message })
    }

});

router.get('/boutique', async (req, res) => {
    try {
        //const [result] = await pool.query("Select * from boutiques");
        const [boutique] = await pool.query('SELECT * FROM boutiques LIMIT 1');
        res.render('boutiques/boutique', {
            boutique: boutique[0] // Pasar solo el objeto, no el array
        });
    }
    catch (err) {
        res.status(500).json({ message: err.message })
    }

});


router.get('/admin', async (req, res) => {
    const page = parseInt(req.query.page) || 1; // Página actual, por defecto 1
    const limit = 9; // Número de registros por página
    const offset = (page - 1) * limit;


    const [productos] = await pool.query('SELECT * FROM productos LIMIT ? OFFSET ?', [limit, offset]);
    
    const [totalResult] = await pool.query('SELECT COUNT(*) AS total FROM productos');
    const total = totalResult[0].total || 0;

    res.render('boutiques/admin', {
        productos,
        currentPage: page,
        totalPages: Math.ceil(total / limit)
    });
    
});

router.post('/boutique/', upload.single('Fotografia'), async (req, res) => { //editar Boutique
    const Fotografia = req.file ? `/img/${req.file.filename}` : null; 
    const { NombreBoutique, Mision, Vision, Telefono, Direccion, Facebook, Instagram, Whatsapp, HorarioLunesViernes, HorarioSabado} = req.body; //
    const editBoutique = {
        NombreBoutique, Mision, Vision, Telefono, Direccion, Facebook, Instagram, Whatsapp,HorarioLunesViernes, HorarioSabado
    };
    if (Fotografia) {
        editBoutique.hrefLogo = Fotografia;
    }


    await pool.query('UPDATE Boutiques SET ? WHERE PkProducto = 1', [editBoutique]); //inser datos
    res.redirect('/boutique?editSuccess=true'); //actualizamos pagina
});




export default router;